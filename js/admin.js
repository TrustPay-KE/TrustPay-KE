/**
 * TrustPay KE - Admin Dashboard System
 * Comprehensive admin management for TrustPay platform
 */

import { 
    databases, 
    DATABASE_IDS, 
    COLLECTION_IDS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';
import { approveKYC, rejectKYC, getPendingKYCApplications } from './kyc.js';
import { resolveDispute, getAllDisputes } from './disputes.js';
import { getAllEscrows } from './escrow.js';

/**
 * Get admin dashboard statistics
 * @returns {Object} Dashboard statistics
 */
export async function getDashboardStats() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        // Get counts in parallel for better performance
        const [
            usersResult,
            escrowsResult,
            transactionsResult,
            disputesResult,
            kycResult
        ] = await Promise.all([
            // Total users
            databases.listDocuments(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, [
                { method: 'limit', value: 1 }
            ]),
            // Total escrows
            databases.listDocuments(DATABASE_IDS.MAIN, COLLECTION_IDS.ESCROWS, [
                { method: 'limit', value: 1 }
            ]),
            // Total transactions
            databases.listDocuments(DATABASE_IDS.MAIN, COLLECTION_IDS.TRANSACTIONS, [
                { method: 'limit', value: 1 }
            ]),
            // Active disputes
            databases.listDocuments(DATABASE_IDS.MAIN, COLLECTION_IDS.DISPUTES, [
                { method: 'equal', attribute: 'status', values: ['pending', 'reviewing'] },
                { method: 'limit', value: 1 }
            ]),
            // Pending KYC
            databases.listDocuments(DATABASE_IDS.MAIN, COLLECTION_IDS.KYC, [
                { method: 'equal', attribute: 'status', values: ['pending'] },
                { method: 'limit', value: 1 }
            ])
        ]);

        // Get escrow status breakdown
        const escrowStatusCounts = await getEscrowStatusCounts();
        
        // Get recent transactions
        const recentTransactions = await getRecentTransactions(10);
        
        // Get pending KYC applications
        const pendingKYC = await getPendingKYCApplications(5, 0);
        
        // Get active disputes
        const activeDisputes = await getAllDisputes('pending', 5, 0);

        return {
            success: true,
            stats: {
                totalUsers: usersResult.total,
                totalEscrows: escrowsResult.total,
                totalTransactions: transactionsResult.total,
                activeDisputes: disputesResult.total,
                pendingKYC: kycResult.total,
                escrowStatusCounts,
                recentTransactions: recentTransactions.transactions || [],
                pendingKYCApplications: pendingKYC.applications || [],
                activeDisputes: activeDisputes.disputes || []
            }
        };

    } catch (error) {
        console.error("Get dashboard stats error:", error);
        return { success: false, error: error.message || "Failed to get dashboard stats" };
    }
}

/**
 * Get escrow status counts
 */
async function getEscrowStatusCounts() {
    try {
        const statuses = ['pending', 'funded', 'in_progress', 'delivered', 'accepted', 'released', 'disputed', 'cancelled', 'refunded'];
        
        const counts = await Promise.all(
            statuses.map(async (status) => {
                const result = await databases.listDocuments(
                    DATABASE_IDS.MAIN,
                    COLLECTION_IDS.ESCROWS,
                    [
                        { method: 'equal', attribute: 'status', values: [status] },
                        { method: 'limit', value: 1 }
                    ]
                );
                return { status, count: result.total };
            })
        );

        return counts.reduce((acc, { status, count }) => {
            acc[status] = count;
            return acc;
        }, {});

    } catch (error) {
        console.error("Get escrow status counts error:", error);
        return {};
    }
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(limit = 10) {
    try {
        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                { method: 'orderDesc', attribute: 'transactionDate' }
            ],
            limit,
            0
        );

        // Enrich with user data
        const enrichedTransactions = await Promise.all(
            result.documents.map(async (transaction) => {
                try {
                    const user = await databases.getDocument(
                        DATABASE_IDS.MAIN,
                        COLLECTION_IDS.USERS,
                        transaction.userId
                    );
                    return {
                        ...transaction,
                        userName: user.name,
                        userEmail: user.email
                    };
                } catch (error) {
                    return transaction;
                }
            })
        );

        return { success: true, transactions: enrichedTransactions };

    } catch (error) {
        console.error("Get recent transactions error:", error);
        return { success: false, transactions: [] };
    }
}

/**
 * Get all users with pagination and filtering
 * @param {string} status - Filter by status (active/inactive)
 * @param {string} kycStatus - Filter by KYC status
 * @param {string} role - Filter by role
 * @param {string} search - Search term
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of users
 */
export async function getAllUsers(status = null, kycStatus = null, role = null, search = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const queries = [];

        if (status !== null) {
            queries.push({ method: 'equal', attribute: 'isActive', values: [status === 'active'] });
        }

        if (kycStatus) {
            queries.push({ method: 'equal', attribute: 'kycStatus', values: [kycStatus] });
        }

        if (role) {
            queries.push({ method: 'equal', attribute: 'role', values: [role] });
        }

        if (search) {
            // Note: Appwrite doesn't support text search, this would need a different approach
            // For now, we'll skip search filtering
        }

        queries.push({ method: 'orderDesc', attribute: 'createdAt' });

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            queries,
            limit,
            offset
        );

        // Remove sensitive data
        const sanitizedUsers = result.documents.map(user => {
            const { notificationPreferences, ...sanitized } = user;
            return sanitized;
        });

        return {
            success: true,
            users: sanitizedUsers,
            total: result.total
        };

    } catch (error) {
        console.error("Get all users error:", error);
        return { success: false, error: error.message || "Failed to get users" };
    }
}

/**
 * Update user status (activate/deactivate)
 * @param {string} userId - User ID
 * @param {boolean} isActive - Active status
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Result
 */
export async function updateUserStatus(userId, isActive, adminNotes = "") {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            userId,
            {
                isActive: isActive,
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        };

    } catch (error) {
        console.error("Update user status error:", error);
        return { success: false, error: error.message || "Failed to update user status" };
    }
}

/**
 * Update user role
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Object} Result
 */
export async function updateUserRole(userId, role) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(role)) {
            return { success: false, error: "Invalid role" };
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            userId,
            {
                role: role,
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: `User role updated to ${role} successfully`
        };

    } catch (error) {
        console.error("Update user role error:", error);
        return { success: false, error: error.message || "Failed to update user role" };
    }
}

/**
 * Get platform settings
 * @returns {Object} Platform settings
 */
export async function getPlatformSettings() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        // For now, return default settings
        // In a real implementation, these would be stored in a settings collection
        const settings = {
            platformFeePercentage: 2.5,
            minimumEscrowAmount: 100,
            maximumEscrowAmount: 1000000,
            kycRequiredForEscrow: true,
            autoReleaseDelay: 24, // hours
            disputeResolutionTime: 72, // hours
            supportedCurrencies: ['KES'],
            maintenanceMode: false,
            registrationEnabled: true,
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: false
        };

        return {
            success: true,
            settings
        };

    } catch (error) {
        console.error("Get platform settings error:", error);
        return { success: false, error: error.message || "Failed to get platform settings" };
    }
}

/**
 * Update platform settings
 * @param {Object} settings - Settings to update
 * @returns {Object} Result
 */
export async function updatePlatformSettings(settings) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        // Validate settings
        const {
            platformFeePercentage,
            minimumEscrowAmount,
            maximumEscrowAmount,
            kycRequiredForEscrow,
            autoReleaseDelay,
            disputeResolutionTime,
            maintenanceMode,
            registrationEnabled,
            emailNotificationsEnabled,
            smsNotificationsEnabled
        } = settings;

        // Validate numeric values
        if (platformFeePercentage < 0 || platformFeePercentage > 10) {
            return { success: false, error: "Platform fee must be between 0% and 10%" };
        }

        if (minimumEscrowAmount < 1 || minimumEscrowAmount > 10000) {
            return { success: false, error: "Minimum escrow amount must be between KES 1 and KES 10,000" };
        }

        if (maximumEscrowAmount < 1000 || maximumEscrowAmount > 10000000) {
            return { success: false, error: "Maximum escrow amount must be between KES 1,000 and KES 10,000,000" };
        }

        if (minimumEscrowAmount > maximumEscrowAmount) {
            return { success: false, error: "Minimum escrow amount cannot be greater than maximum" };
        }

        // TODO: Store settings in database
        // For now, just return success

        return {
            success: true,
            message: "Platform settings updated successfully"
        };

    } catch (error) {
        console.error("Update platform settings error:", error);
        return { success: false, error: error.message || "Failed to update platform settings" };
    }
}

/**
 * Get transaction history with filters
 * @param {string} status - Filter by status
 * @param {string} type - Filter by type
 * @param {string} paymentMethod - Filter by payment method
 * @param {string} dateFrom - Start date
 * @param {string} dateTo - End date
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} Transaction history
 */
export async function getTransactionHistory(status = null, type = null, paymentMethod = null, dateFrom = null, dateTo = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const queries = [];

        if (status) {
            queries.push({ method: 'equal', attribute: 'status', values: [status] });
        }

        if (type) {
            queries.push({ method: 'equal', attribute: 'type', values: [type] });
        }

        if (paymentMethod) {
            queries.push({ method: 'equal', attribute: 'paymentMethod', values: [paymentMethod] });
        }

        queries.push({ method: 'orderDesc', attribute: 'transactionDate' });

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            queries,
            limit,
            offset
        );

        // Enrich with user data
        const enrichedTransactions = await Promise.all(
            result.documents.map(async (transaction) => {
                try {
                    const [userDoc, escrow] = await Promise.all([
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.USERS, transaction.userId),
                        databases.getDocument(DATABASE_IDS.MAIN, COLLECTION_IDS.ESCROWS, transaction.escrowId)
                    ]);

                    return {
                        ...transaction,
                        userName: userDoc.name,
                        userEmail: userDoc.email,
                        escrowDescription: escrow.description,
                        escrowStatus: escrow.status
                    };
                } catch (error) {
                    console.warn("Failed to enrich transaction:", error);
                    return transaction;
                }
            })
        );

        return {
            success: true,
            transactions: enrichedTransactions,
            total: result.total
        };

    } catch (error) {
        console.error("Get transaction history error:", error);
        return { success: false, error: error.message || "Failed to get transaction history" };
    }
}

/**
 * Force release funds (admin override)
 * @param {string} escrowId - Escrow ID
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Result
 */
export async function forceReleaseFunds(escrowId, adminNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Create release transaction
        await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            `transaction_${Date.now()}`,
            {
                transactionId: `transaction_${Date.now()}`,
                escrowId: escrowId,
                userId: escrow.sellerId,
                type: 'release',
                amount: escrow.amount,
                currency: escrow.currency,
                status: 'completed',
                paymentMethod: 'admin_override',
                transactionDate: new Date().toISOString(),
                processedAt: new Date().toISOString(),
                notes: `Admin override release: ${adminNotes.trim()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // Update escrow status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId,
            {
                status: 'released',
                releasedAt: new Date().toISOString(),
                adminNotes: `Admin override: ${adminNotes.trim()}`,
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: "Funds released successfully (admin override)"
        };

    } catch (error) {
        console.error("Force release funds error:", error);
        return { success: false, error: error.message || "Failed to release funds" };
    }
}

/**
 * Force refund (admin override)
 * @param {string} escrowId - Escrow ID
 * @param {string} adminNotes - Admin notes
 * @returns {Object} Result
 */
export async function forceRefund(escrowId, adminNotes = "") {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Create refund transaction
        await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            `transaction_${Date.now()}`,
            {
                transactionId: `transaction_${Date.now()}`,
                escrowId: escrowId,
                userId: escrow.buyerId,
                type: 'refund',
                amount: escrow.amount,
                currency: escrow.currency,
                status: 'completed',
                paymentMethod: 'admin_override',
                transactionDate: new Date().toISOString(),
                processedAt: new Date().toISOString(),
                notes: `Admin override refund: ${adminNotes.trim()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // Update escrow status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId,
            {
                status: 'refunded',
                refundedAt: new Date().toISOString(),
                adminNotes: `Admin override: ${adminNotes.trim()}`,
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: "Refund processed successfully (admin override)"
        };

    } catch (error) {
        console.error("Force refund error:", error);
        return { success: false, error: error.message || "Failed to process refund" };
    }
}

export default {
    getDashboardStats,
    getAllUsers,
    updateUserStatus,
    updateUserRole,
    getPlatformSettings,
    updatePlatformSettings,
    getTransactionHistory,
    forceReleaseFunds,
    forceRefund,
    // Re-export KYC and dispute functions for convenience
    approveKYC,
    rejectKYC,
    getPendingKYCApplications,
    resolveDispute,
    getAllDisputes,
    getAllEscrows
};
