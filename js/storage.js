/**
 * TrustPay KE - Storage Module
 * Handles file uploads for proof of payment and documents
 */

import { storage, ID, BUCKET_IDS } from "./appwriteConfig.js";
import { getCurrentUser } from "./auth.js";

// Allowed file types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = MAX_DOCUMENT_SIZE;

/**
 * Upload proof of payment
 * @param {File} file - File to upload
 * @param {string} transactionId - Related transaction ID
 * @returns {Object} Result with file info or error
 */
export async function uploadProofOfPayment(file, transactionId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate file
        const validation = validateFile(file, "proof");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique file name
        const fileName = `proof_${transactionId}_${Date.now()}_${file.name}`;

        // Upload to storage
        const uploadedFile = await storage.createFile(
            BUCKET_IDS.PROOF_OF_PAYMENT,
            ID.unique(),
            file
        );

        // Store reference in database (call this separately)
        const fileInfo = {
            id: uploadedFile.$id,
            name: uploadedFile.name,
            bucketId: BUCKET_IDS.PROOF_OF_PAYMENT,
            transactionId: transactionId,
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString(),
            mimeType: file.type,
            sizeOriginal: file.size
        };

        return { success: true, file: fileInfo };

    } catch (error) {
        console.error("Upload proof of payment error:", error);
        return { success: false, error: error.message || "Failed to upload file" };
    }
}

/**
 * Upload general document
 * @param {File} file - File to upload
 * @param {string} description - File description
 * @returns {Object} Result
 */
export async function uploadDocument(file, description = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate file
        const validation = validateFile(file, "document");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique file name
        const fileName = `doc_${user.id}_${Date.now()}_${file.name}`;

        // Upload to storage
        const uploadedFile = await storage.createFile(
            BUCKET_IDS.DOCUMENTS,
            ID.unique(),
            file
        );

        const fileInfo = {
            id: uploadedFile.$id,
            name: uploadedFile.name,
            originalName: file.name,
            description: description,
            bucketId: BUCKET_IDS.DOCUMENTS,
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString(),
            mimeType: file.type,
            sizeOriginal: file.size
        };

        return { success: true, file: fileInfo };

    } catch (error) {
        console.error("Upload document error:", error);
        return { success: false, error: error.message || "Failed to upload document" };
    }
}

/**
 * Upload any file to general bucket
 * @param {File} file - File to upload
 * @param {string} type - File type (proof, document, general)
 * @returns {Object} Result
 */
export async function uploadFile(file, type = "general") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate file
        const validation = validateFile(file, type);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const bucketId = getBucketId(type);
        const fileName = `file_${type}_${user.id}_${Date.now()}_${file.name}`;

        const uploadedFile = await storage.createFile(
            bucketId,
            ID.unique(),
            file
        );

        return { 
            success: true, 
            file: {
                id: uploadedFile.$id,
                name: uploadedFile.name,
                bucketId: bucketId,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error("Upload file error:", error);
        return { success: false, error: error.message || "Failed to upload file" };
    }
}

/**
 * Get file preview URL
 * @param {string} fileId - File ID
 * @param {string} bucketId - Bucket ID
 * @param {number} width - Preview width (for images)
 * @returns {string} Preview URL
 */
export function getFilePreviewUrl(fileId, bucketId, width = 400) {
    return storage.getFilePreview(bucketId, fileId, width);
}

/**
 * Get file download URL
 * @param {string} fileId - File ID
 * @param {string} bucketId - Bucket ID
 * @returns {string} Download URL
 */
export function getFileDownloadUrl(fileId, bucketId) {
    return storage.getFileDownload(bucketId, fileId);
}

/**
 * Delete a file
 * @param {string} fileId - File ID
 * @param {string} bucketId - Bucket ID
 * @returns {Object} Result
 */
export async function deleteFile(fileId, bucketId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        await storage.deleteFile(bucketId, fileId);

        return { success: true };

    } catch (error) {
        console.error("Delete file error:", error);
        return { success: false, error: error.message || "Failed to delete file" };
    }
}

/**
 * List user's uploaded files
 * @param {string} bucketId - Bucket ID
 * @param {number} limit - Max results
 * @returns {Object} Result
 */
export async function listUserFiles(bucketId = BUCKET_IDS.DOCUMENTS, limit = 20) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Note: Appwrite doesn't support file owner filtering directly
        // This would need to be handled differently in production
        const files = await storage.listFiles(bucketId, undefined, limit);

        return { success: true, files: files.files };

    } catch (error) {
        console.error("List files error:", error);
        return { success: false, error: error.message || "Failed to list files" };
    }
}

/**
 * Get bucket ID based on file type
 * @param {string} type - File type
 * @returns {string} Bucket ID
 */
function getBucketId(type) {
    switch (type) {
        case "proof":
            return BUCKET_IDS.PROOF_OF_PAYMENT;
        case "document":
            return BUCKET_IDS.DOCUMENTS;
        default:
            return BUCKET_IDS.FILES;
    }
}

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {string} type - File type
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateFile(file, type) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: "No file selected" };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { 
            valid: false, 
            error: `Invalid file type. Allowed: ${ALLOWED_TYPES.map(t => t.split("/")[1]).join(", ")}` 
        };
    }

    // Check file size
    let maxSize = MAX_FILE_SIZE;
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        maxSize = MAX_IMAGE_SIZE;
    } else if (ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        maxSize = MAX_DOCUMENT_SIZE;
    }

    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
    }

    return { valid: true };
}

/**
 * Validate file type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isValidImageType(mimeType) {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Validate file type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isValidDocumentType(mimeType) {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType);
}

/**
 * Get human readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
