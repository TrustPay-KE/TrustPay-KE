/**
 * TrustPay KE - KYC (Know Your Customer) System
 * Handles user verification and document storage
 */

import { 
    client, 
    account, 
    databases, 
    storage, 
    ID, 
    DATABASE_IDS, 
    COLLECTION_IDS, 
    BUCKET_IDS, 
    KYC_STATUS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';

/**
 * Submit KYC application
 * @param {Object} kycData - KYC information
 * @param {File} selfieImage - Selfie image file
 * @param {File} idDocument - ID document file
 * @returns {Object} Result
 */
export async function submitKYC(kycData, selfieImage, idDocument) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate required fields
        const { fullName, idType, idNumber } = kycData;
        if (!fullName || !idType || !idNumber) {
            return { success: false, error: "All KYC fields are required" };
        }

        // Validate ID number format
        if (idType === 'national_id') {
            // Kenya National ID format validation
            const idRegex = /^[0-9]{8}$/;
            if (!idRegex.test(idNumber)) {
                return { success: false, error: "Invalid National ID format" };
            }
        } else if (idType === 'passport') {
            // Passport format validation
            const passportRegex = /^[A-Z0-9]{6,9}$/;
            if (!passportRegex.test(idNumber)) {
                return { success: false, error: "Invalid passport format" };
            }
        }

        // Check if KYC already exists
        let kycDocument;
        try {
            kycDocument = await databases.getDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.KYC,
                user.id
            );
        } catch (error) {
            // KYC doesn't exist, create new one
            kycDocument = null;
        }

        // Upload selfie image
        let selfieImageId = null;
        if (selfieImage) {
            const selfieResult = await storage.createFile(
                BUCKET_IDS.KYC_DOCUMENTS,
                ID.unique(),
                selfieImage
            );
            selfieImageId = selfieResult.$id;
        }

        // Upload ID document
        let idDocumentImageId = null;
        if (idDocument) {
            const idDocResult = await storage.createFile(
                BUCKET_IDS.KYC_DOCUMENTS,
                ID.unique(),
                idDocument
            );
            idDocumentImageId = idDocResult.$id;
        }

        const kycPayload = {
            userId: user.id,
            fullName: fullName.trim(),
            idType,
            idNumber: idNumber.toUpperCase(),
            selfieImageId,
            idDocumentImageId,
            status: KYC_STATUS.PENDING,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (kycDocument) {
            // Update existing KYC
            await databases.updateDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.KYC,
                kycDocument.$id,
                kycPayload
            );
        } else {
            // Create new KYC
            await databases.createDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.KYC,
                user.id,
                {
                    kycId: ID.unique(),
                    ...kycPayload,
                    createdAt: new Date().toISOString()
                }
            );
        }

        // Update user KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            { 
                kycStatus: KYC_STATUS.PENDING,
                updatedAt: new Date().toISOString()
            }
        );

        return { 
            success: true, 
            message: "KYC application submitted successfully. Please wait for verification." 
        };

    } catch (error) {
        console.error("Submit KYC error:", error);
        return { success: false, error: error.message || "Failed to submit KYC" };
    }
}

/**
 * Get user KYC status and details
 * @returns {Object} KYC information
 */
export async function getKYCStatus() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        let kycData;
        try {
            kycData = await databases.getDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.KYC,
                user.id
            );
        } catch (error) {
            // No KYC record found
            return {
                success: true,
                status: KYC_STATUS.NOT_STARTED,
                message: "KYC verification not started"
            };
        }

        // Get file URLs for documents
        let selfieUrl = null;
        let idDocumentUrl = null;

        if (kycData.selfieImageId) {
            try {
                selfieUrl = storage.getFileView(
                    BUCKET_IDS.KYC_DOCUMENTS,
                    kycData.selfieImageId
                );
            } catch (error) {
                console.warn("Failed to get selfie URL:", error);
            }
        }

        if (kycData.idDocumentImageId) {
            try {
                idDocumentUrl = storage.getFileView(
                    BUCKET_IDS.KYC_DOCUMENTS,
                    kycData.idDocumentImageId
                );
            } catch (error) {
                console.warn("Failed to get ID document URL:", error);
            }
        }

        return {
            success: true,
            ...kycData,
            selfieUrl,
            idDocumentUrl
        };

    } catch (error) {
        console.error("Get KYC status error:", error);
        return { success: false, error: error.message || "Failed to get KYC status" };
    }
}

/**
 * Admin: Approve KYC application
 * @param {string} userId - User ID
 * @param {string} adminNotes - Optional admin notes
 * @returns {Object} Result
 */
export async function approveKYC(userId, adminNotes = "") {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        // Get KYC document
        const kycDoc = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            userId
        );

        // Update KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            kycDoc.$id,
            {
                status: KYC_STATUS.VERIFIED,
                verifiedBy: currentUser.id,
                verifiedAt: new Date().toISOString(),
                adminNotes,
                updatedAt: new Date().toISOString()
            }
        );

        // Update user KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            userId,
            { 
                kycStatus: KYC_STATUS.VERIFIED,
                isVerified: true,
                updatedAt: new Date().toISOString()
            }
        );

        return { 
            success: true, 
            message: "KYC approved successfully" 
        };

    } catch (error) {
        console.error("Approve KYC error:", error);
        return { success: false, error: error.message || "Failed to approve KYC" };
    }
}

/**
 * Admin: Reject KYC application
 * @param {string} userId - User ID
 * @param {string} rejectionReason - Reason for rejection
 * @param {string} adminNotes - Optional admin notes
 * @returns {Object} Result
 */
export async function rejectKYC(userId, rejectionReason, adminNotes = "") {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        if (!rejectionReason || rejectionReason.trim().length < 10) {
            return { success: false, error: "Rejection reason must be at least 10 characters" };
        }

        // Get KYC document
        const kycDoc = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            userId
        );

        // Update KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            kycDoc.$id,
            {
                status: KYC_STATUS.REJECTED,
                rejectionReason: rejectionReason.trim(),
                verifiedBy: currentUser.id,
                verifiedAt: new Date().toISOString(),
                adminNotes,
                updatedAt: new Date().toISOString()
            }
        );

        // Update user KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            userId,
            { 
                kycStatus: KYC_STATUS.REJECTED,
                isVerified: false,
                updatedAt: new Date().toISOString()
            }
        );

        return { 
            success: true, 
            message: "KYC rejected" 
        };

    } catch (error) {
        console.error("Reject KYC error:", error);
        return { success: false, error: error.message || "Failed to reject KYC" };
    }
}

/**
 * Admin: Get all pending KYC applications
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of KYC applications
 */
export async function getPendingKYCApplications(limit = 50, offset = 0) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            [
                { method: 'equal', attribute: 'status', values: [KYC_STATUS.PENDING] },
                { method: 'orderDesc', attribute: 'submittedAt' }
            ],
            limit,
            offset
        );

        // Enrich with user data and document URLs
        const enrichedApplications = await Promise.all(
            result.documents.map(async (kyc) => {
                try {
                    const user = await databases.getDocument(
                        DATABASE_IDS.MAIN,
                        COLLECTION_IDS.USERS,
                        kyc.userId
                    );

                    let selfieUrl = null;
                    let idDocumentUrl = null;

                    if (kyc.selfieImageId) {
                        try {
                            selfieUrl = storage.getFileView(
                                BUCKET_IDS.KYC_DOCUMENTS,
                                kyc.selfieImageId
                            );
                        } catch (error) {
                            console.warn("Failed to get selfie URL:", error);
                        }
                    }

                    if (kyc.idDocumentImageId) {
                        try {
                            idDocumentUrl = storage.getFileView(
                                BUCKET_IDS.KYC_DOCUMENTS,
                                kyc.idDocumentImageId
                            );
                        } catch (error) {
                            console.warn("Failed to get ID document URL:", error);
                        }
                    }

                    return {
                        ...kyc,
                        user: {
                            id: user.userId,
                            name: user.name,
                            email: user.email,
                            phone: user.phone
                        },
                        selfieUrl,
                        idDocumentUrl
                    };
                } catch (error) {
                    console.warn("Failed to enrich KYC application:", error);
                    return kyc;
                }
            })
        );

        return {
            success: true,
            applications: enrichedApplications,
            total: result.total
        };

    } catch (error) {
        console.error("Get pending KYC applications error:", error);
        return { success: false, error: error.message || "Failed to get pending applications" };
    }
}

/**
 * Delete KYC documents (for re-submission)
 * @returns {Object} Result
 */
export async function deleteKYCDocuments() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const kycDoc = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            user.id
        );

        // Delete uploaded files
        if (kycDoc.selfieImageId) {
            await storage.deleteFile(BUCKET_IDS.KYC_DOCUMENTS, kycDoc.selfieImageId);
        }

        if (kycDoc.idDocumentImageId) {
            await storage.deleteFile(BUCKET_IDS.KYC_DOCUMENTS, kycDoc.idDocumentImageId);
        }

        // Update KYC document to remove file references
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.KYC,
            kycDoc.$id,
            {
                selfieImageId: null,
                idDocumentImageId: null,
                status: KYC_STATUS.NOT_STARTED,
                updatedAt: new Date().toISOString()
            }
        );

        // Update user KYC status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            { 
                kycStatus: KYC_STATUS.NOT_STARTED,
                updatedAt: new Date().toISOString()
            }
        );

        return { 
            success: true, 
            message: "KYC documents deleted. You can submit new documents." 
        };

    } catch (error) {
        console.error("Delete KYC documents error:", error);
        return { success: false, error: error.message || "Failed to delete KYC documents" };
    }
}

/**
 * Validate KYC requirements for escrow creation
 * @returns {Object} Validation result
 */
export async function validateKYCForEscrow() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { valid: false, reason: "Not authenticated" };
        }

        if (user.kycStatus !== KYC_STATUS.VERIFIED) {
            return { 
                valid: false, 
                reason: "KYC verification required before creating escrow",
                kycStatus: user.kycStatus
            };
        }

        return { valid: true };

    } catch (error) {
        console.error("Validate KYC for escrow error:", error);
        return { valid: false, reason: "Failed to validate KYC status" };
    }
}

export default {
    submitKYC,
    getKYCStatus,
    approveKYC,
    rejectKYC,
    getPendingKYCApplications,
    deleteKYCDocuments,
    validateKYCForEscrow
};
