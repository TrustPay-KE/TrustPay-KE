/**
 * TrustPay KE - Dispute Resolution System
 * Handles escrow disputes and admin resolution process
 */

import { 
    databases, 
    storage, 
    ID, 
    DATABASE_IDS, 
    COLLECTION_IDS, 
    BUCKET_IDS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';
import { updateEscrowStatus } from './escrow.js';

/**
 * Raise a dispute for an escrow
 * @param {string} escrowId - Escrow ID
 * @param {Object} disputeData - Dispute details
 * @param {File[]} evidenceFiles - Evidence files (optional)
 * @returns {Object} Result
 */
export async function raiseDispute(escrowId, disputeData, evidenceFiles = []) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const { disputeType, description } = disputeData;

        // Validate inputs
        if (!escrowId || !disputeType || !description) {
            return { success: false, error: "All fields are required" };
        }

        // Validate description length
        if (description.trim().length < 50 || description.trim().length > 2000) {
            return { success: false, error: "Description must be between 50 and 2000 characters" };
        }

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow
        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id) {
            return { success: false, error: "You are not a party to this escrow" };
        }

        // Validate escrow status allows disputes
        const disputableStatuses = ['in_progress', 'delivered'];
        if (!disputableStatuses.includes(escrow.status)) {
            return { success: false, error: "Escrow cannot be disputed in current status" };
        }

        // Check if dispute already exists
        const existingDisputes = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            [
                { method: 'equal', attribute: 'escrowId', values: [escrowId] },
                { method: 'equal', attribute: 'status', values: ['pending', 'reviewing'] }
            ]
        );

        if (existingDisputes.documents.length > 0) {
            return { success: false, error: "A dispute is already open for this escrow" };
        }

        // Upload evidence files
        const evidenceFileIds = [];
        for (const file of evidenceFiles) {
            try {
                const fileResult = await storage.createFile(
                    BUCKET_IDS.PROOF_FILES,
                    ID.unique(),
                    file
                );
                evidenceFileIds.push(fileResult.$id);
            } catch (fileError) {
                console.error("Failed to upload evidence file:", fileError);
                // Continue with other files
            }
        }

        // Determine dispute role
        const disputeRole = escrow.buyerId === user.id ? 'buyer' : 'seller';

        // Create dispute
        const dispute = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            ID.unique(),
            {
                disputeId: ID.unique(),
                escrowId: escrowId,
                raisedBy: user.id,
                disputeType: disputeType,
                description: description.trim(),
                status: 'pending',
                evidenceFileIds: evidenceFileIds,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // Update escrow status to disputed
        await updateEscrowStatus(escrowId, 'disputed', {
            disputeRaisedBy: user.id,
            disputeReason: description.trim()
        });

        // TODO: Send notification to other party and admin

        return {
            success: true,
            dispute,
            message: "Dispute raised successfully. Our team will review your case."
        };

    } catch (error) {
        console.error("Raise dispute error:", error);
        return { success: false, error: error.message || "Failed to raise dispute" };
    }
}

/**
 * Get dispute details
 * @param {string} disputeId - Dispute ID
 * @returns {Object} Dispute details
 */
export async function getDispute(disputeId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const dispute = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            disputeId
        );

        // Validate user is party to escrow or admin
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            dispute.escrowId
        );

        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id && user.role !== 'admin') {
            return { success: false, error: "Access denied" };
        }

        // Get file URLs for evidence
        const evidenceUrls = [];
        for (const fileId of dispute.evidenceFileIds || []) {
            try {
                const url = storage.getFileView(BUCKET_IDS.PROOF_FILES, fileId);
                evidenceUrls.push({ fileId, url });
            } catch (error) {
                console.warn("Failed to get evidence file URL:", error);
            }
        }

        // Enrich with user data
        let raisedByUser = null;
        try {
            raisedByUser = await databases.getDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.USERS,
                dispute.raisedBy
            );
        } catch (error) {
            console.warn("Failed to get user data:", error);
        }

        return {
            success: true,
            dispute: {
                ...dispute,
                evidenceUrls,
                raisedByUser: raisedByUser ? {
                    id: raisedByUser.userId,
                    name: raisedByUser.name,
                    email: raisedByUser.email
                } : null,
                escrow: {
                    id: escrow.escrowId,
                    amount: escrow.amount,
                    description: escrow.description,
                    buyerId: escrow.buyerId,
                    sellerId: escrow.sellerId
                }
            }
        };

    } catch (error) {
        console.error("Get dispute error:", error);
        return { success: false, error: error.message || "Failed to get dispute" };
    }
}

/**
 * Admin: Resolve dispute
 * @param {string} disputeId - Dispute ID
 * @param {string} resolutionAction - Action (release_to_seller, refund_to_buyer)
 * @param {string} adminDecision - Decision details
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Result
 */
export async function resolveDispute(disputeId, resolutionAction, adminDecision, adminNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        // Validate resolution action
        const validActions = ['release_to_seller', 'refund_to_buyer'];
        if (!validActions.includes(resolutionAction)) {
            return { success: false, error: "Invalid resolution action" };
        }

        // Validate decision
        if (!adminDecision || adminDecision.trim().length < 20) {
            return { success: false, error: "Admin decision must be at least 20 characters" };
        }

        const dispute = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            disputeId
        );

        // Validate dispute status
        if (dispute.status === 'resolved') {
            return { success: false, error: "Dispute is already resolved" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            dispute.escrowId
        );

        // Update dispute
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            disputeId,
            {
                status: 'resolved',
                adminDecision: adminDecision.trim(),
                resolutionAction: resolutionAction,
                resolvedBy: user.id,
                resolvedAt: new Date().toISOString(),
                adminNotes: adminNotes.trim(),
                updatedAt: new Date().toISOString()
            }
        );

        // Execute resolution action
        let result;
        if (resolutionAction === 'release_to_seller') {
            // Release funds to seller
            result = await updateEscrowStatus(escrow.escrowId, 'released', {
                adminNotes: `Dispute resolved: ${adminDecision.trim()}`,
                releasedAt: new Date().toISOString()
            });

            // Create release transaction
            await databases.createDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.TRANSACTIONS,
                ID.unique(),
                {
                    transactionId: ID.unique(),
                    escrowId: escrow.escrowId,
                    userId: escrow.sellerId,
                    type: 'release',
                    amount: escrow.amount,
                    currency: escrow.currency,
                    status: 'completed',
                    paymentMethod: 'internal',
                    transactionDate: new Date().toISOString(),
                    processedAt: new Date().toISOString(),
                    notes: `Funds released via dispute resolution`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            );

        } else if (resolutionAction === 'refund_to_buyer') {
            // Refund to buyer
            result = await updateEscrowStatus(escrow.escrowId, 'refunded', {
                adminNotes: `Dispute resolved: ${adminDecision.trim()}`,
                refundedAt: new Date().toISOString()
            });

            // Create refund transaction
            await databases.createDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.TRANSACTIONS,
                ID.unique(),
                {
                    transactionId: ID.unique(),
                    escrowId: escrow.escrowId,
                    userId: escrow.buyerId,
                    type: 'refund',
                    amount: escrow.amount,
                    currency: escrow.currency,
                    status: 'completed',
                    paymentMethod: 'mpesa',
                    transactionDate: new Date().toISOString(),
                    processedAt: new Date().toISOString(),
                    notes: `Refund via dispute resolution`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            );
        }

        // TODO: Send notifications to both parties

        return {
            success: true,
            message: `Dispute resolved successfully. Funds will be ${resolutionAction === 'release_to_seller' ? 'released to seller' : 'refunded to buyer'}.`
        };

    } catch (error) {
        console.error("Resolve dispute error:", error);
        return { success: false, error: error.message || "Failed to resolve dispute" };
    }
}

/**
 * Admin: Get all disputes
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of disputes
 */
export async function getAllDisputes(status = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const queries = [];

        if (status) {
            queries.push({ method: 'equal', attribute: 'status', values: [status] });
        }

        queries.push({ method: 'orderDesc', attribute: 'createdAt' });

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            queries,
            limit,
            offset
        );

        // Enrich with escrow and user data
        const enrichedDisputes = await Promise.all(
            result.documents.map(async (dispute) => {
                try {
                    const [escrow, raisedByUser] = await Promise.all([
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.ESCROWS, dispute.escrowId),
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, dispute.raisedBy)
                    ]);

                    const [buyer, seller] = await Promise.all([
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, escrow.buyerId),
                        escrow.sellerId ? databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, escrow.sellerId) : null
                    ]);

                    return {
                        ...dispute,
                        escrow: {
                            id: escrow.escrowId,
                            amount: escrow.amount,
                            description: escrow.description,
                            status: escrow.status,
                            createdAt: escrow.createdAt
                        },
                        raisedByUser: {
                            id: raisedByUser.userId,
                            name: raisedByUser.name,
                            email: raisedByUser.email,
                            phone: raisedByUser.phone
                        },
                        buyer: {
                            id: buyer.userId,
                            name: buyer.name,
                            email: buyer.email
                        },
                        seller: seller ? {
                            id: seller.userId,
                            name: seller.name,
                            email: seller.email
                        } : null
                    };
                } catch (error) {
                    console.warn("Failed to enrich dispute:", error);
                    return dispute;
                }
            })
        );

        return {
            success: true,
            disputes: enrichedDisputes,
            total: result.total
        };

    } catch (error) {
        console.error("Get all disputes error:", error);
        return { success: false, error: error.message || "Failed to get disputes" };
    }
}

/**
 * Get user's disputes
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of disputes
 */
export async function getUserDisputes(status = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Get user's escrows
        const escrowsResult = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            [
                { method: 'equal', attribute: 'buyerId', values: [user.id] },
                { method: 'limit', value: 100 }
            ]
        );

        const sellerEscrowsResult = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            [
                { method: 'equal', attribute: 'sellerId', values: [user.id] },
                { method: 'limit', value: 100 }
            ]
        );

        const allEscrowIds = [
            ...escrowsResult.documents.map(e => e.escrowId),
            ...sellerEscrowsResult.documents.map(e => e.escrowId)
        ];

        if (allEscrowIds.length === 0) {
            return { success: true, disputes: [], total: 0 };
        }

        // Get disputes for these escrows
        const queries = [
            { method: 'equal', attribute: 'escrowId', values: allEscrowIds },
            { method: 'orderDesc', attribute: 'createdAt' }
        ];

        if (status) {
            queries.push({ method: 'equal', attribute: 'status', values: [status] });
        }

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            queries,
            limit,
            offset
        );

        // Enrich with escrow data
        const enrichedDisputes = await Promise.all(
            result.documents.map(async (dispute) => {
                try {
                    const escrow = await databases.getDocument(
                        DATABASE_IDS.MAIN,
                        COLLECTION_IDS.ESCROWS,
                        dispute.escrowId
                    );

                    return {
                        ...dispute,
                        escrow: {
                            id: escrow.escrowId,
                            amount: escrow.amount,
                            description: escrow.description,
                            status: escrow.status,
                            buyerId: escrow.buyerId,
                            sellerId: escrow.sellerId
                        }
                    };
                } catch (error) {
                    console.warn("Failed to enrich dispute:", error);
                    return dispute;
                }
            })
        );

        return {
            success: true,
            disputes: enrichedDisputes,
            total: result.total
        };

    } catch (error) {
        console.error("Get user disputes error:", error);
        return { success: false, error: error.message || "Failed to get disputes" };
    }
}

/**
 * Admin: Update dispute status
 * @param {string} disputeId - Dispute ID
 * @param {string} newStatus - New status
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Result
 */
export async function updateDisputeStatus(disputeId, newStatus, adminNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const validStatuses = ['pending', 'reviewing', 'resolved'];
        if (!validStatuses.includes(newStatus)) {
            return { success: false, error: "Invalid status" };
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.DISPUTES,
            disputeId,
            {
                status: newStatus,
                adminNotes: adminNotes.trim(),
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: `Dispute status updated to ${newStatus}`
        };

    } catch (error) {
        console.error("Update dispute status error:", error);
        return { success: false, error: error.message || "Failed to update dispute status" };
    }
}

export default {
    raiseDispute,
    getDispute,
    resolveDispute,
    getAllDisputes,
    getUserDisputes,
    updateDisputeStatus
};
