/**
 * TrustPay KE - Escrow System
 * Core escrow functionality with full lifecycle management
 */

import { 
    client, 
    databases, 
    ID, 
    DATABASE_IDS, 
    COLLECTION_IDS, 
    ESCROW_STATUS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';
import { validateKYCForEscrow } from './kyc.js';

/**
 * Create new escrow transaction
 * @param {Object} escrowData - Escrow details
 * @returns {Object} Result
 */
export async function createEscrow(escrowData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate KYC requirements
        const kycValidation = await validateKYCForEscrow();
        if (!kycValidation.valid) {
            return { success: false, error: kycValidation.reason };
        }

        const { sellerId, amount, description, sellerEmail, sellerPhone } = escrowData;

        // Validate required fields
        if (!amount || !description) {
            return { success: false, error: "Amount and description are required" };
        }

        // Validate amount
        if (amount < 100 || amount > 1000000) {
            return { success: false, error: "Amount must be between KES 100 and KES 1,000,000" };
        }

        // Validate description
        if (description.trim().length < 10 || description.trim().length > 1000) {
            return { success: false, error: "Description must be between 10 and 1000 characters" };
        }

        let finalSellerId = sellerId;

        // Check if seller exists or needs to be invited
        if (sellerId) {
            try {
                const seller = await databases.getDocument(
                    DATABASE_IDS.MAIN,
                    COLLECTION_IDS.USERS,
                    sellerId
                );
                if (!seller.isActive) {
                    return { success: false, error: "Seller account is not active" };
                }
            } catch (error) {
                return { success: false, error: "Seller not found" };
            }
        } else if (sellerEmail || sellerPhone) {
            // Create invite for new seller
            const inviteResult = await createSellerInvite(user.id, sellerEmail, sellerPhone);
            if (!inviteResult.success) {
                return inviteResult;
            }
            finalSellerId = null; // Will be set when invite is accepted
        } else {
            return { success: false, error: "Either seller ID, email, or phone is required" };
        }

        // Calculate platform fee (2.5% default)
        const platformFeePercentage = 2.5;
        const platformFee = (amount * platformFeePercentage) / 100;
        const totalAmount = amount + platformFee;

        // Create escrow
        const escrow = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            ID.unique(),
            {
                escrowId: ID.unique(),
                buyerId: user.id,
                sellerId: finalSellerId,
                amount: amount,
                currency: "KES",
                description: description.trim(),
                status: ESCROW_STATUS.PENDING,
                termsAccepted: false,
                buyerTermsAccepted: false,
                sellerTermsAccepted: false,
                platformFee: platformFee,
                platformFeePercentage: platformFeePercentage,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            escrow,
            message: "Escrow created successfully"
        };

    } catch (error) {
        console.error("Create escrow error:", error);
        return { success: false, error: error.message || "Failed to create escrow" };
    }
}

/**
 * Accept escrow terms (buyer or seller)
 * @param {string} escrowId - Escrow ID
 * @param {boolean} asBuyer - Whether accepting as buyer
 * @returns {Object} Result
 */
export async function acceptEscrowTerms(escrowId, asBuyer = true) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow
        if (asBuyer && escrow.buyerId !== user.id) {
            return { success: false, error: "You are not the buyer of this escrow" };
        }
        if (!asBuyer && escrow.sellerId !== user.id) {
            return { success: false, error: "You are not the seller of this escrow" };
        }

        // Update terms acceptance
        const updates = {
            updatedAt: new Date().toISOString()
        };

        if (asBuyer) {
            updates.buyerTermsAccepted = true;
        } else {
            updates.sellerTermsAccepted = true;
        }

        // Check if both parties have accepted
        if (escrow.buyerTermsAccepted && updates.sellerTermsAccepted) {
            updates.termsAccepted = true;
        } else if (updates.buyerTermsAccepted && escrow.sellerTermsAccepted) {
            updates.termsAccepted = true;
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId,
            updates
        );

        return {
            success: true,
            message: "Terms accepted successfully"
        };

    } catch (error) {
        console.error("Accept escrow terms error:", error);
        return { success: false, error: error.message || "Failed to accept terms" };
    }
}

/**
 * Get escrow details
 * @param {string} escrowId - Escrow ID
 * @returns {Object} Escrow details
 */
export async function getEscrow(escrowId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow or admin
        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id && user.role !== 'admin') {
            return { success: false, error: "Access denied" };
        }

        // Enrich with user data
        let buyer = null;
        let seller = null;

        try {
            buyer = await databases.getDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.USERS,
                escrow.buyerId
            );
            // Remove sensitive data
            delete buyer.notificationPreferences;
        } catch (error) {
            console.warn("Failed to get buyer data:", error);
        }

        if (escrow.sellerId) {
            try {
                seller = await databases.getDocument(
                    DATABASE_IDS.MAIN,
                    COLLECTION_IDS.USERS,
                    escrow.sellerId
                );
                // Remove sensitive data
                delete seller.notificationPreferences;
            } catch (error) {
                console.warn("Failed to get seller data:", error);
            }
        }

        return {
            success: true,
            escrow: {
                ...escrow,
                buyer: buyer ? {
                    id: buyer.userId,
                    name: buyer.name,
                    email: buyer.email,
                    phone: buyer.phone,
                    kycStatus: buyer.kycStatus
                } : null,
                seller: seller ? {
                    id: seller.userId,
                    name: seller.name,
                    email: seller.email,
                    phone: seller.phone,
                    kycStatus: seller.kycStatus
                } : null
            }
        };

    } catch (error) {
        console.error("Get escrow error:", error);
        return { success: false, error: error.message || "Failed to get escrow" };
    }
}

/**
 * Update escrow status
 * @param {string} escrowId - Escrow ID
 * @param {string} newStatus - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Object} Result
 */
export async function updateEscrowStatus(escrowId, newStatus, additionalData = {}) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow or admin
        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id && user.role !== 'admin') {
            return { success: false, error: "Access denied" };
        }

        // Validate status transitions
        const validTransitions = {
            [ESCROW_STATUS.PENDING]: [ESCROW_STATUS.CANCELLED],
            [ESCROW_STATUS.FUNDED]: [ESCROW_STATUS.IN_PROGRESS, ESCROW_STATUS.CANCELLED],
            [ESCROW_STATUS.IN_PROGRESS]: [ESCROW_STATUS.DELIVERED, ESCROW_STATUS.DISPUTED],
            [ESCROW_STATUS.DELIVERED]: [ESCROW_STATUS.ACCEPTED, ESCROW_STATUS.DISPUTED],
            [ESCROW_STATUS.ACCEPTED]: [ESCROW_STATUS.RELEASED],
            [ESCROW_STATUS.DISPUTED]: [ESCROW_STATUS.RELEASED, ESCROW_STATUS.REFUNDED],
            [ESCROW_STATUS.CANCELLED]: [ESCROW_STATUS.REFUNDED]
        };

        if (validTransitions[escrow.status] && !validTransitions[escrow.status].includes(newStatus)) {
            return { success: false, error: `Invalid status transition from ${escrow.status} to ${newStatus}` };
        }

        // Prepare update data
        const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...additionalData
        };

        // Add timestamps based on status
        const statusTimestamps = {
            [ESCROW_STATUS.FUNDED]: 'fundedAt',
            [ESCROW_STATUS.IN_PROGRESS]: 'inProgressAt',
            [ESCROW_STATUS.DELIVERED]: 'deliveredAt',
            [ESCROW_STATUS.ACCEPTED]: 'acceptedAt',
            [ESCROW_STATUS.RELEASED]: 'releasedAt'
        };

        if (statusTimestamps[newStatus]) {
            updates[statusTimestamps[newStatus]] = new Date().toISOString();
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId,
            updates
        );

        return {
            success: true,
            message: `Escrow status updated to ${newStatus}`
        };

    } catch (error) {
        console.error("Update escrow status error:", error);
        return { success: false, error: error.message || "Failed to update escrow status" };
    }
}

/**
 * Mark escrow as delivered (seller action)
 * @param {string} escrowId - Escrow ID
 * @param {string} deliveryNotes - Optional delivery notes
 * @returns {Object} Result
 */
export async function markAsDelivered(escrowId, deliveryNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is seller
        if (escrow.sellerId !== user.id) {
            return { success: false, error: "Only the seller can mark as delivered" };
        }

        // Validate escrow status
        if (escrow.status !== ESCROW_STATUS.IN_PROGRESS) {
            return { success: false, error: "Escrow must be in progress to mark as delivered" };
        }

        return await updateEscrowStatus(escrowId, ESCROW_STATUS.DELIVERED, {
            notes: deliveryNotes.trim()
        });

    } catch (error) {
        console.error("Mark as delivered error:", error);
        return { success: false, error: error.message || "Failed to mark as delivered" };
    }
}

/**
 * Accept delivery (buyer action)
 * @param {string} escrowId - Escrow ID
 * @param {string} acceptanceNotes - Optional acceptance notes
 * @returns {Object} Result
 */
export async function acceptDelivery(escrowId, acceptanceNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is buyer
        if (escrow.buyerId !== user.id) {
            return { success: false, error: "Only the buyer can accept delivery" };
        }

        // Validate escrow status
        if (escrow.status !== ESCROW_STATUS.DELIVERED) {
            return { success: false, error: "Escrow must be delivered to accept" };
        }

        // Update to accepted status first
        const result = await updateEscrowStatus(escrowId, ESCROW_STATUS.ACCEPTED, {
            notes: acceptanceNotes.trim()
        });

        if (result.success) {
            // Automatically trigger fund release
            setTimeout(() => {
                releaseFunds(escrowId);
            }, 1000);
        }

        return result;

    } catch (error) {
        console.error("Accept delivery error:", error);
        return { success: false, error: error.message || "Failed to accept delivery" };
    }
}

/**
 * Release funds to seller (automatic or admin action)
 * @param {string} escrowId - Escrow ID
 * @param {string} adminNotes - Optional admin notes
 * @returns {Object} Result
 */
export async function releaseFunds(escrowId, adminNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is admin or this is an automatic release
        if (user.role !== 'admin' && escrow.status !== ESCROW_STATUS.ACCEPTED) {
            return { success: false, error: "Access denied" };
        }

        // Validate escrow status
        if (escrow.status !== ESCROW_STATUS.ACCEPTED && user.role === 'admin') {
            return { success: false, error: "Escrow must be accepted to release funds" };
        }

        // Create release transaction
        const transactionData = {
            transactionId: ID.unique(),
            escrowId: escrowId,
            userId: escrow.sellerId,
            type: 'release',
            amount: escrow.amount,
            currency: escrow.currency,
            status: 'completed',
            paymentMethod: 'internal',
            transactionDate: new Date().toISOString(),
            processedAt: new Date().toISOString()
        };

        await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            ID.unique(),
            transactionData
        );

        // Update escrow status
        const updates = {
            status: ESCROW_STATUS.RELEASED,
            releasedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (adminNotes) {
            updates.adminNotes = adminNotes.trim();
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId,
            updates
        );

        return {
            success: true,
            message: "Funds released successfully"
        };

    } catch (error) {
        console.error("Release funds error:", error);
        return { success: false, error: error.message || "Failed to release funds" };
    }
}

/**
 * Cancel escrow
 * @param {string} escrowId - Escrow ID
 * @param {string} reason - Cancellation reason
 * @returns {Object} Result
 */
export async function cancelEscrow(escrowId, reason = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow or admin
        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id && user.role !== 'admin') {
            return { success: false, error: "Access denied" };
        }

        // Validate escrow status
        if (escrow.status !== ESCROW_STATUS.PENDING && escrow.status !== ESCROW_STATUS.FUNDED) {
            return { success: false, error: "Only pending or funded escrows can be cancelled" };
        }

        return await updateEscrowStatus(escrowId, ESCROW_STATUS.CANCELLED, {
            notes: `Cancelled by ${user.role === 'admin' ? 'admin' : user.id === escrow.buyerId ? 'buyer' : 'seller'}: ${reason.trim()}`
        });

    } catch (error) {
        console.error("Cancel escrow error:", error);
        return { success: false, error: error.message || "Failed to cancel escrow" };
    }
}

/**
 * Get user's escrows
 * @param {string} status - Filter by status (optional)
 * @param {string} role - Filter by role (buyer/seller, optional)
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of escrows
 */
export async function getUserEscrows(status = null, role = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const queries = [];

        // Filter by status
        if (status) {
            queries.push({ method: 'equal', attribute: 'status', values: [status] });
        }

        // Filter by role
        if (role === 'buyer') {
            queries.push({ method: 'equal', attribute: 'buyerId', values: [user.id] });
        } else if (role === 'seller') {
            queries.push({ method: 'equal', attribute: 'sellerId', values: [user.id] });
        } else {
            // Get all escrows where user is buyer or seller
            queries.push({ method: 'equal', attribute: 'buyerId', values: [user.id] });
            // Note: Appwrite doesn't support OR queries, so we'll need to make two calls
        }

        // Order by creation date (newest first)
        queries.push({ method: 'orderDesc', attribute: 'createdAt' });

        let result;
        if (role === 'buyer' || role === 'seller') {
            result = await databases.listDocuments(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.ESCROWS,
                queries,
                limit,
                offset
            );
        } else {
            // Get both buyer and seller escrows
            const buyerResult = await databases.listDocuments(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.ESCROWS,
                [
                    { method: 'equal', attribute: 'buyerId', values: [user.id] },
                    ...queries.filter(q => q.attribute !== 'buyerId'),
                    { method: 'orderDesc', attribute: 'createdAt' }
                ],
                limit,
                offset
            );

            const sellerResult = await databases.listDocuments(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.ESCROWS,
                [
                    { method: 'equal', attribute: 'sellerId', values: [user.id] },
                    ...queries.filter(q => q.attribute !== 'sellerId'),
                    { method: 'orderDesc', attribute: 'createdAt' }
                ],
                limit,
                offset
            );

            // Combine and sort results
            const combined = [...buyerResult.documents, ...sellerResult.documents]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);

            result = { documents: combined, total: combined.length };
        }

        return {
            success: true,
            escrows: result.documents,
            total: result.total
        };

    } catch (error) {
        console.error("Get user escrows error:", error);
        return { success: false, error: error.message || "Failed to get escrows" };
    }
}

/**
 * Admin: Get all escrows
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of escrows
 */
export async function getAllEscrows(status = null, limit = 50, offset = 0) {
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
            COLLECTION_IDS.ESCROWS,
            queries,
            limit,
            offset
        );

        // Enrich with user data
        const enrichedEscrows = await Promise.all(
            result.documents.map(async (escrow) => {
                try {
                    const [buyer, seller] = await Promise.all([
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, escrow.buyerId),
                        escrow.sellerId ? databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, escrow.sellerId) : null
                    ]);

                    return {
                        ...escrow,
                        buyer: {
                            id: buyer.userId,
                            name: buyer.name,
                            email: buyer.email,
                            phone: buyer.phone
                        },
                        seller: seller ? {
                            id: seller.userId,
                            name: seller.name,
                            email: seller.email,
                            phone: seller.phone
                        } : null
                    };
                } catch (error) {
                    console.warn("Failed to enrich escrow:", error);
                    return escrow;
                }
            })
        );

        return {
            success: true,
            escrows: enrichedEscrows,
            total: result.total
        };

    } catch (error) {
        console.error("Get all escrows error:", error);
        return { success: false, error: error.message || "Failed to get escrows" };
    }
}

/**
 * Create seller invite (for new sellers)
 * @param {string} buyerId - Buyer ID
 * @param {string} email - Seller email (optional)
 * @param {string} phone - Seller phone (optional)
 * @returns {Object} Result
 */
async function createSellerInvite(buyerId, email = null, phone = null) {
    try {
        const inviteCode = generateInviteCode();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            ID.unique(),
            {
                inviteId: ID.unique(),
                escrowId: null, // Will be set when escrow is created
                invitedBy: buyerId,
                inviteCode: inviteCode,
                inviteType: 'seller',
                email: email,
                phone: phone,
                status: 'pending',
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // TODO: Send invite via email/SMS

        return {
            success: true,
            inviteCode,
            message: "Invite sent successfully"
        };

    } catch (error) {
        console.error("Create seller invite error:", error);
        return { success: false, error: error.message || "Failed to create invite" };
    }
}

/**
 * Generate unique invite code
 * @returns {string} Invite code
 */
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export default {
    createEscrow,
    acceptEscrowTerms,
    getEscrow,
    updateEscrowStatus,
    markAsDelivered,
    acceptDelivery,
    releaseFunds,
    cancelEscrow,
    getUserEscrows,
    getAllEscrows
};
