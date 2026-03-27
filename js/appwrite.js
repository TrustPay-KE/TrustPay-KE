/**
 * TrustPay KE - Appwrite Configuration
 * 
 * Project: TrustPay (69c165c7003cae4214fe)
 * Region: Frankfurt (fra.cloud.appwrite.io)
 * 
 * This is the main configuration file that exports all
 * Appwrite services and constants used throughout the application.
 */

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

// Appwrite Endpoint & Project
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "69c165c7003cae4214fe";

// Initialize Client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialize Services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// ============================================
// DATABASE & COLLECTION IDs
// Update these with your actual Appwrite IDs
// ============================================

export const DATABASE_IDS = {
    MAIN: "trustpay_main"
};

export const COLLECTION_IDS = {
    USERS: "users",
    ESCROWS: "escrows", 
    TRANSACTIONS: "transactions",
    DISPUTES: "disputes",
    KYC: "kyc",
    NOTIFICATIONS: "notifications",
    INVITES: "invites"
};

export const BUCKET_IDS = {
    KYC_DOCUMENTS: "kyc_documents",
    PROOF_FILES: "proof_files",
    PROFILE_IMAGES: "profile_images"
};

export const ESCROW_STATUS = {
    PENDING: "pending",
    FUNDED: "funded", 
    IN_PROGRESS: "in_progress",
    DELIVERED: "delivered",
    ACCEPTED: "accepted",
    RELEASED: "released",
    DISPUTED: "disputed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded"
};

export const KYC_STATUS = {
    NOT_STARTED: "not_started",
    PENDING: "pending", 
    VERIFIED: "verified",
    REJECTED: "rejected"
};

export const USER_ROLES = {
    USER: "user",
    ADMIN: "admin"
};

// ============================================
// VERIFY CONNECTION
// ============================================
// Ping Appwrite to verify setup on page load
client.ping()
    .then(() => {
        console.log("TrustPay Appwrite: Connected successfully");
    })
    .catch((error) => {
        console.error("TrustPay Appwrite: Connection failed", error);
    });

// ============================================
// EXPORTS
// ============================================
export { 
    client, 
    account, 
    databases, 
    storage, 
    ID, 
    Query,
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID
};
