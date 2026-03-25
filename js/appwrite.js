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
    MAIN: "trustpay_main"  // Update with your database ID
};

export const COLLECTION_IDS = {
    USERS: "users",          // User profiles
    TRANSACTIONS: "transactions",  // Escrow transactions
    ESCROW: "escrow",        // Escrow records with proof files
    PAYMENTS: "payments"     // Payment records
};

export const BUCKET_IDS = {
    FILES: "files",                    // General file uploads
    PROOF_OF_PAYMENT: "proof_of_payment",  // Payment proof images
    DOCUMENTS: "documents"           // User documents
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
