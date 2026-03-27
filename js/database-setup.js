/**
 * TrustPay KE - Database Schema Setup
 * 
 * Production-ready database schemas for Appwrite
 * Includes all collections, attributes, and indexes
 */

import { databases, DATABASE_IDS, COLLECTION_IDS } from './appwrite.js';

// ============================================
// COLLECTION SCHEMAS
// ============================================

export const COLLECTION_SCHEMAS = {
    
    // USERS COLLECTION
    [COLLECTION_IDS.USERS]: {
        name: "users",
        attributes: [
            { key: "userId", type: "string", size: 255, required: true },
            { key: "name", type: "string", size: 255, required: true },
            { key: "email", type: "email", required: true },
            { key: "phone", type: "string", size: 20, required: true },
            { key: "kycStatus", type: "string", size: 20, default: "not_started" },
            { key: "role", type: "string", size: 20, default: "user" },
            { key: "profileImageId", type: "string", size: 255, required: false },
            { key: "isVerified", type: "boolean", default: false },
            { key: "isActive", type: "boolean", default: true },
            { key: "lastLoginAt", type: "datetime", required: false },
            { key: "notificationPreferences", type: "json", required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "userId", type: "unique" },
            { key: "email", type: "unique" },
            { key: "phone", type: "unique" },
            { key: "kycStatus" },
            { key: "role" },
            { key: "createdAt" }
        ]
    },

    // ESCROWS COLLECTION
    [COLLECTION_IDS.ESCROWS]: {
        name: "escrows",
        attributes: [
            { key: "escrowId", type: "string", size: 255, required: true },
            { key: "buyerId", type: "string", size: 255, required: true },
            { key: "sellerId", type: "string", size: 255, required: true },
            { key: "amount", type: "decimal", required: true },
            { key: "currency", type: "string", size: 10, default: "KES" },
            { key: "description", type: "string", size: 1000, required: true },
            { key: "status", type: "string", size: 20, default: "pending" },
            { key: "termsAccepted", type: "boolean", default: false },
            { key: "buyerTermsAccepted", type: "boolean", default: false },
            { key: "sellerTermsAccepted", type: "boolean", default: false },
            { key: "fundedAt", type: "datetime", required: false },
            { key: "deliveredAt", type: "datetime", required: false },
            { key: "acceptedAt", type: "datetime", required: false },
            { key: "releasedAt", type: "datetime", required: false },
            { key: "platformFee", type: "decimal", default: 0 },
            { key: "platformFeePercentage", type: "decimal", default: 2.5 },
            { key: "proofFileIds", type: "json", required: false },
            { key: "notes", type: "string", size: 2000, required: false },
            { key: "disputeRaisedBy", type: "string", size: 255, required: false },
            { key: "disputeReason", type: "string", size: 1000, required: false },
            { key: "adminNotes", type: "string", size: 2000, required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "escrowId", type: "unique" },
            { key: "buyerId" },
            { key: "sellerId" },
            { key: "status" },
            { key: "createdAt" },
            { key: "amount" },
            { key: ["buyerId", "status"] },
            { key: ["sellerId", "status"] }
        ]
    },

    // TRANSACTIONS COLLECTION
    [COLLECTION_IDS.TRANSACTIONS]: {
        name: "transactions",
        attributes: [
            { key: "transactionId", type: "string", size: 255, required: true },
            { key: "escrowId", type: "string", size: 255, required: true },
            { key: "userId", type: "string", size: 255, required: true },
            { key: "type", type: "string", size: 20, required: true }, // payment, release, refund
            { key: "amount", type: "decimal", required: true },
            { key: "currency", type: "string", size: 10, default: "KES" },
            { key: "status", type: "string", size: 20, required: true }, // pending, completed, failed
            { key: "paymentMethod", type: "string", size: 50, required: true }, // mpesa, bank
            { key: "paymentDetails", type: "json", required: false },
            { key: "mpesaReceipt", type: "string", size: 100, required: false },
            { key: "phoneNumber", type: "string", size: 20, required: false },
            { key: "transactionDate", type: "datetime", required: true },
            { key: "processedAt", type: "datetime", required: false },
            { key: "failureReason", type: "string", size: 500, required: false },
            { key: "webhookData", type: "json", required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "transactionId", type: "unique" },
            { key: "escrowId" },
            { key: "userId" },
            { key: "status" },
            { key: "type" },
            { key: "transactionDate" },
            { key: "mpesaReceipt" },
            { key: ["escrowId", "type"] }
        ]
    },

    // DISPUTES COLLECTION
    [COLLECTION_IDS.DISPUTES]: {
        name: "disputes",
        attributes: [
            { key: "disputeId", type: "string", size: 255, required: true },
            { key: "escrowId", type: "string", size: 255, required: true },
            { key: "raisedBy", type: "string", size: 255, required: true },
            { key: "disputeType", type: "string", size: 50, required: true }, // goods_not_delivered, quality_issue, fraud, other
            { key: "description", type: "string", size: 2000, required: true },
            { key: "status", type: "string", size: 20, default: "pending" }, // pending, reviewing, resolved
            { key: "evidenceFileIds", type: "json", required: false },
            { key: "adminDecision", type: "string", size: 1000, required: false },
            { key: "resolutionAction", type: "string", size: 20, required: false }, // release_to_seller, refund_to_buyer
            { key: "resolvedBy", type: "string", size: 255, required: false },
            { key: "resolvedAt", type: "datetime", required: false },
            { key: "adminNotes", type: "string", size: 2000, required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "disputeId", type: "unique" },
            { key: "escrowId" },
            { key: "raisedBy" },
            { key: "status" },
            { key: "createdAt" },
            { key: ["status", "createdAt"] }
        ]
    },

    // KYC COLLECTION
    [COLLECTION_IDS.KYC]: {
        name: "kyc",
        attributes: [
            { key: "kycId", type: "string", size: 255, required: true },
            { key: "userId", type: "string", size: 255, required: true },
            { key: "fullName", type: "string", size: 255, required: true },
            { key: "idType", type: "string", size: 50, required: true }, // national_id, passport
            { key: "idNumber", type: "string", size: 100, required: true },
            { key: "selfieImageId", type: "string", size: 255, required: false },
            { key: "idDocumentImageId", type: "string", size: 255, required: false },
            { key: "status", type: "string", size: 20, default: "not_started" },
            { key: "rejectionReason", type: "string", size: 1000, required: false },
            { key: "verifiedBy", type: "string", size: 255, required: false },
            { key: "verifiedAt", type: "datetime", required: false },
            { key: "adminNotes", type: "string", size: 2000, required: false },
            { key: "submittedAt", type: "datetime", required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "kycId", type: "unique" },
            { key: "userId", type: "unique" },
            { key: "status" },
            { key: "submittedAt" },
            { key: "idNumber" }
        ]
    },

    // NOTIFICATIONS COLLECTION
    [COLLECTION_IDS.NOTIFICATIONS]: {
        name: "notifications",
        attributes: [
            { key: "notificationId", type: "string", size: 255, required: true },
            { key: "userId", type: "string", size: 255, required: true },
            { key: "type", type: "string", size: 50, required: true }, // escrow_created, payment_received, funds_released, dispute_opened, kyc_updated
            { key: "title", type: "string", size: 255, required: true },
            { key: "message", type: "string", size: 2000, required: true },
            { key: "relatedId", type: "string", size: 255, required: false }, // escrowId, transactionId, etc.
            { key: "relatedType", type: "string", size: 50, required: false },
            { key: "isRead", type: "boolean", default: false },
            { key: "emailSent", type: "boolean", default: false },
            { key: "smsSent", type: "boolean", default: false },
            { key: "pushSent", type: "boolean", default: false },
            { key: "scheduledAt", type: "datetime", required: false },
            { key: "sentAt", type: "datetime", required: false },
            { key: "createdAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "notificationId", type: "unique" },
            { key: "userId" },
            { key: "type" },
            { key: "isRead" },
            { key: "createdAt" },
            { key: ["userId", "isRead"] },
            { key: ["userId", "createdAt"] }
        ]
    },

    // INVITES COLLECTION
    [COLLECTION_IDS.INVITES]: {
        name: "invites",
        attributes: [
            { key: "inviteId", type: "string", size: 255, required: true },
            { key: "escrowId", type: "string", size: 255, required: true },
            { key: "invitedBy", type: "string", size: 255, required: true },
            { key: "inviteCode", type: "string", size: 100, required: true },
            { key: "inviteType", type: "string", size: 20, required: true }, // buyer, seller
            { key: "email", type: "email", required: false },
            { key: "phone", type: "string", size: 20, required: false },
            { key: "status", type: "string", size: 20, default: "pending" }, // pending, accepted, expired
            { key: "acceptedBy", type: "string", size: 255, required: false },
            { key: "acceptedAt", type: "datetime", required: false },
            { key: "expiresAt", type: "datetime", required: true },
            { key: "sentAt", type: "datetime", required: false },
            { key: "createdAt", type: "datetime", required: true },
            { key: "updatedAt", type: "datetime", required: true }
        ],
        indexes: [
            { key: "inviteId", type: "unique" },
            { key: "inviteCode", type: "unique" },
            { key: "escrowId" },
            { key: "invitedBy" },
            { key: "status" },
            { key: "email" },
            { key: "phone" },
            { key: "expiresAt" },
            { key: ["email", "status"] },
            { key: ["phone", "status"] }
        ]
    }
};

// ============================================
// DATABASE SETUP FUNCTIONS
// ============================================

export async function setupDatabase() {
    try {
        console.log('Setting up TrustPay database...');
        
        // Create database if it doesn't exist
        try {
            await databases.get(DATABASE_IDS.MAIN);
            console.log(`Database ${DATABASE_IDS.MAIN} already exists`);
        } catch (error) {
            if (error.code === 404) {
                await databases.create(DATABASE_IDS.MAIN, 'TrustPay Main Database');
                console.log(`Created database: ${DATABASE_IDS.MAIN}`);
            } else {
                throw error;
            }
        }

        // Create collections
        for (const [collectionKey, schema] of Object.entries(COLLECTION_SCHEMAS)) {
            try {
                await databases.get(DATABASE_IDS.MAIN, collectionKey);
                console.log(`Collection ${collectionKey} already exists`);
            } catch (error) {
                if (error.code === 404) {
                    await databases.create(
                        DATABASE_IDS.MAIN, 
                        collectionKey, 
                        schema.name,
                        schema.attributes
                    );
                    console.log(`Created collection: ${collectionKey}`);
                    
                    // Create indexes
                    for (const index of schema.indexes) {
                        try {
                            if (Array.isArray(index.key)) {
                                await databases.createIndex(
                                    DATABASE_IDS.MAIN,
                                    collectionKey,
                                    index.key.join('_'),
                                    index.key,
                                    index.type === 'unique'
                                );
                            } else {
                                await databases.createIndex(
                                    DATABASE_IDS.MAIN,
                                    collectionKey,
                                    index.key,
                                    index.key,
                                    index.type === 'unique'
                                );
                            }
                            console.log(`Created index: ${index.key} on ${collectionKey}`);
                        } catch (indexError) {
                            console.warn(`Failed to create index ${index.key}:`, indexError.message);
                        }
                    }
                } else {
                    throw error;
                }
            }
        }

        console.log('Database setup completed successfully!');
        return true;
    } catch (error) {
        console.error('Database setup failed:', error);
        throw error;
    }
}

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION_RULES = {
    users: {
        name: { required: true, minLength: 2, maxLength: 255 },
        email: { required: true, format: 'email' },
        phone: { required: true, pattern: /^(\+254|0)[17]\d{8}$/ },
        kycStatus: { enum: ['not_started', 'pending', 'verified', 'rejected'] },
        role: { enum: ['user', 'admin'] }
    },
    escrows: {
        amount: { required: true, min: 100, max: 1000000 },
        description: { required: true, minLength: 10, maxLength: 1000 },
        status: { enum: ['pending', 'funded', 'in_progress', 'delivered', 'accepted', 'released', 'disputed', 'cancelled', 'refunded'] }
    },
    transactions: {
        amount: { required: true, min: 100, max: 1000000 },
        type: { enum: ['payment', 'release', 'refund'] },
        status: { enum: ['pending', 'completed', 'failed'] },
        paymentMethod: { enum: ['mpesa', 'bank'] }
    }
};

export default COLLECTION_SCHEMAS;
