/**
 * TrustPay KE - Database Module
 * Handles all database operations for transactions and escrow
 */

import { databases, ID, Query, DATABASE_IDS, COLLECTION_IDS } from "./appwriteConfig.js";
import { getCurrentUser } from "./auth.js";

/**
 * Create a new escrow transaction
 * @param {Object} data - Transaction data
 * @returns {Object} Result with transaction or error
 */
export async function createTransaction(data) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate required fields
        const { senderId, receiverId, amount, description, type } = data;

        if (!amount || amount <= 0) {
            return { success: false, error: "Invalid amount" };
        }

        if (!description || description.length < 5) {
            return { success: false, error: "Description must be at least 5 characters" };
        }

        // Generate unique tracking number
        const trackingNumber = generateTrackingNumber();

        // Create transaction document
        const transaction = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            ID.unique(),
            {
                trackingNumber: trackingNumber,
                senderId: senderId || user.id,
                senderName: data.senderName || user.name,
                senderEmail: data.senderEmail || user.email,
                receiverId: receiverId || "",
                receiverName: data.receiverName || "",
                receiverEmail: data.receiverEmail || "",
                amount: parseFloat(amount),
                description: description,
                type: type || "buyer", // buyer or seller
                status: "pending", // pending -> held -> released/completed/cancelled
                mpesaCode: "",
                serviceFee: calculateServiceFee(amount),
                totalAmount: parseFloat(amount) + calculateServiceFee(amount),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        return { success: true, transaction };

    } catch (error) {
        console.error("Create transaction error:", error);
        return { success: false, error: error.message || "Failed to create transaction" };
    }
}

/**
 * Get transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Object} Result
 */
export async function getTransaction(transactionId) {
    try {
        const transaction = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            transactionId
        );

        return { success: true, transaction };

    } catch (error) {
        console.error("Get transaction error:", error);
        return { success: false, error: "Transaction not found" };
    }
}

/**
 * Get user's transactions
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Max number of results
 * @returns {Object} Result with transactions array
 */
export async function getUserTransactions(status = null, limit = 50) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const queries = [
            Query.equal("senderId", user.id),
            Query.orderDesc("$createdAt"),
            Query.limit(limit)
        ];

        if (status) {
            queries.push(Query.equal("status", status));
        }

        const response = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            queries
        );

        return { success: true, transactions: response.documents };

    } catch (error) {
        console.error("Get user transactions error:", error);
        return { success: false, error: "Failed to fetch transactions" };
    }
}

/**
 * Get all transactions (admin only)
 * @param {Object} filters - Filter options
 * @returns {Object} Result
 */
export async function getAllTransactions(filters = {}) {
    try {
        const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];

        if (filters.status) {
            queries.push(Query.equal("status", filters.status));
        }
        if (filters.type) {
            queries.push(Query.equal("type", filters.type));
        }

        const response = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            queries
        );

        return { success: true, transactions: response.documents };

    } catch (error) {
        console.error("Get all transactions error:", error);
        return { success: false, error: "Failed to fetch transactions" };
    }
}

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} newStatus - New status
 * @param {Object} additionalData - Additional fields to update
 * @returns {Object} Result
 */
export async function updateTransactionStatus(transactionId, newStatus, additionalData = {}) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Get current transaction
        const { transaction, error: getError } = await getTransaction(transactionId);
        if (!transaction) {
            return { success: false, error: getError || "Transaction not found" };
        }

        // Security: Only sender or admin can update status
        const isSender = transaction.senderId === user.id;
        const isAdmin = user.role === "admin" || user.role === "director";

        if (!isSender && !isAdmin) {
            return { success: false, error: "Unauthorized to update this transaction" };
        }

        // Validate status transition
        const validTransitions = {
            "pending": ["held", "cancelled"],
            "held": ["released", "refunded", "disputed"],
            "released": [],
            "cancelled": [],
            "refunded": [],
            "disputed": []
        };

        if (!validTransitions[transaction.status]?.includes(newStatus)) {
            return { success: false, error: `Cannot change status from ${transaction.status} to ${newStatus}` };
        }

        // Update transaction
        const updated = await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            transactionId,
            {
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: user.id,
                ...additionalData
            }
        );

        return { success: true, transaction: updated };

    } catch (error) {
        console.error("Update transaction status error:", error);
        return { success: false, error: error.message || "Failed to update transaction" };
    }
}

/**
 * Update transaction with M-Pesa code
 * @param {string} transactionId - Transaction ID
 * @param {string} mpesaCode - M-Pesa confirmation code
 * @returns {Object} Result
 */
export async function confirmPayment(transactionId, mpesaCode) {
    try {
        if (!mpesaCode || mpesaCode.length < 10) {
            return { success: false, error: "Invalid M-Pesa code" };
        }

        return await updateTransactionStatus(transactionId, "held", { mpesaCode });

    } catch (error) {
        console.error("Confirm payment error:", error);
        return { success: false, error: error.message || "Failed to confirm payment" };
    }
}

/**
 * Release escrow funds (admin only)
 * @param {string} transactionId - Transaction ID
 * @returns {Object} Result
 */
export async function releaseEscrow(transactionId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Security: Only admin can release escrow
        if (user.role !== "admin" && user.role !== "director") {
            return { success: false, error: "Only administrators can release escrow funds" };
        }

        // Get transaction
        const { transaction, error: getError } = await getTransaction(transactionId);
        if (!transaction) {
            return { success: false, error: getError || "Transaction not found" };
        }

        // Can only release if status is "held"
        if (transaction.status !== "held") {
            return { success: false, error: "Can only release funds from held escrow" };
        }

        // Update to released
        const updated = await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            transactionId,
            {
                status: "released",
                releasedAt: new Date().toISOString(),
                releasedBy: user.id,
                updatedAt: new Date().toISOString()
            }
        );

        return { success: true, transaction: updated };

    } catch (error) {
        console.error("Release escrow error:", error);
        return { success: false, error: error.message || "Failed to release escrow" };
    }
}

/**
 * Create escrow record
 * @param {string} transactionId - Related transaction ID
 * @param {string} proofFileId - Uploaded proof of payment file ID
 * @returns {Object} Result
 */
export async function createEscrow(transactionId, proofFileId = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const escrow = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROW,
            ID.unique(),
            {
                transactionId: transactionId,
                proofFile: proofFileId,
                status: "pending",
                createdBy: user.id,
                createdAt: new Date().toISOString()
            }
        );

        return { success: true, escrow };

    } catch (error) {
        console.error("Create escrow error:", error);
        return { success: false, error: error.message || "Failed to create escrow record" };
    }
}

/**
 * Update escrow status
 * @param {string} escrowId - Escrow ID
 * @param {string} status - New status (pending, approved, rejected)
 * @param {string} notes - Admin notes
 * @returns {Object} Result
 */
export async function updateEscrowStatus(escrowId, status, notes = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Security: Only admin can update escrow status
        if (user.role !== "admin" && user.role !== "director") {
            return { success: false, error: "Only administrators can update escrow" };
        }

        const updated = await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROW,
            escrowId,
            {
                status: status,
                notes: notes,
                reviewedBy: user.id,
                reviewedAt: new Date().toISOString()
            }
        );

        return { success: true, escrow: updated };

    } catch (error) {
        console.error("Update escrow error:", error);
        return { success: false, error: error.message || "Failed to update escrow" };
    }
}

/**
 * Get escrow by transaction ID
 * @param {string} transactionId - Transaction ID
 * @returns {Object} Result
 */
export async function getEscrowByTransaction(transactionId) {
    try {
        const response = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROW,
            [
                Query.equal("transactionId", transactionId),
                Query.limit(1)
            ]
        );

        if (response.documents.length === 0) {
            return { success: false, error: "No escrow found" };
        }

        return { success: true, escrow: response.documents[0] };

    } catch (error) {
        console.error("Get escrow error:", error);
        return { success: false, error: "Failed to fetch escrow" };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique tracking number
 * @returns {string}
 */
function generateTrackingNumber() {
    const prefix = "TP-KEN";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate service fee based on amount
 * Fee structure:
 * - 0 - 200 KES: Free
 * - 201 - 1000 KES: 30 KES flat
 * - 1001 - 5000 KES: 2%
 * - 5001 - 10000 KES: 1.8%
 * - 10001 - 50000 KES: 1.5%
 * - 50001 - 100000 KES: 1%
 * - 100001 - 500000 KES: 0.9%
 * - 500001+: 0.7%
 * 
 * @param {number} amount - Transaction amount
 * @returns {number}
 */
export function calculateServiceFee(amount) {
    const amt = parseFloat(amount);
    
    if (amt <= 200) return 0;
    if (amt <= 1000) return 30;
    if (amt <= 5000) return Math.round(amt * 0.02);
    if (amt <= 10000) return Math.round(amt * 0.018);
    if (amt <= 50000) return Math.round(amt * 0.015);
    if (amt <= 100000) return Math.round(amt * 0.01);
    if (amt <= 500000) return Math.round(amt * 0.009);
    return Math.round(amt * 0.007);
}

/**
 * Get transaction statistics
 * @returns {Object} Stats
 */
export async function getTransactionStats() {
    try {
        const { transactions } = await getUserTransactions(null, 1000);
        
        const stats = {
            total: transactions.length,
            pending: transactions.filter(t => t.status === "pending").length,
            held: transactions.filter(t => t.status === "held").length,
            released: transactions.filter(t => t.status === "released").length,
            cancelled: transactions.filter(t => t.status === "cancelled").length,
            totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalFees: transactions.reduce((sum, t) => sum + (t.serviceFee || 0), 0)
        };

        return { success: true, stats };

    } catch (error) {
        console.error("Get stats error:", error);
        return { success: false, error: "Failed to fetch statistics" };
    }
}

/**
 * Track order by tracking number
 * @param {string} trackingNumber - Order tracking number
 * @returns {Object} Result
 */
export async function trackOrder(trackingNumber) {
    try {
        const response = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                Query.equal("trackingNumber", trackingNumber.toUpperCase()),
                Query.limit(1)
            ]
        );

        if (response.documents.length === 0) {
            return { success: false, error: "Order not found" };
        }

        return { success: true, transaction: response.documents[0] };

    } catch (error) {
        console.error("Track order error:", error);
        return { success: false, error: "Failed to track order" };
    }
}
