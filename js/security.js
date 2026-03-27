/**
 * TrustPay KE - Security Rules and Permissions
 * Defines access control and security policies for the platform
 */

import { getCurrentUser } from './auth.js';

// ============================================
// ROLE-BASED PERMISSIONS
// ============================================

export const PERMISSIONS = {
    // User permissions
    USER: {
        // Profile management
        READ_OWN_PROFILE: true,
        UPDATE_OWN_PROFILE: true,
        DELETE_OWN_ACCOUNT: true,
        
        // KYC
        SUBMIT_KYC: true,
        READ_OWN_KYC: true,
        
        // Escrow operations
        CREATE_ESCROW: true, // Requires KYC verification
        READ_OWN_ESCROWS: true,
        UPDATE_OWN_ESCROWS: true, // Limited to status changes
        CANCEL_OWN_ESCROW: true,
        
        // Transactions
        READ_OWN_TRANSACTIONS: true,
        CREATE_PAYMENT: true,
        
        // Disputes
        RAISE_DISPUTE: true,
        READ_OWN_DISPUTES: true,
        
        // Invites
        CREATE_INVITE: true,
        ACCEPT_INVITE: true,
        READ_OWN_INVITES: true,
        CANCEL_OWN_INVITE: true,
        
        // Notifications
        READ_OWN_NOTIFICATIONS: true,
        UPDATE_NOTIFICATION_PREFERENCES: true
    },
    
    // Admin permissions
    ADMIN: {
        // User management
        READ_ALL_USERS: true,
        UPDATE_ANY_USER: true,
        DEACTIVATE_USER: true,
        UPDATE_USER_ROLE: true,
        
        // KYC management
        READ_ALL_KYC: true,
        APPROVE_KYC: true,
        REJECT_KYC: true,
        
        // Escrow management
        READ_ALL_ESCROWS: true,
        UPDATE_ANY_ESCROW: true,
        FORCE_RELEASE_FUNDS: true,
        FORCE_REFUND: true,
        
        // Transaction management
        READ_ALL_TRANSACTIONS: true,
        
        // Dispute management
        READ_ALL_DISPUTES: true,
        RESOLVE_DISPUTE: true,
        UPDATE_DISPUTE_STATUS: true,
        
        // Platform management
        READ_PLATFORM_STATS: true,
        UPDATE_PLATFORM_SETTINGS: true,
        
        // System management
        CLEANUP_EXPIRED_INVITES: true,
        ACCESS_SYSTEM_LOGS: true
    }
};

// ============================================
// RESOURCE ACCESS RULES
// ============================================

export const ACCESS_RULES = {
    // Users collection
    [COLLECTION_IDS.USERS]: {
        read: (user, document) => {
            // Users can read their own profile
            if (user && document && user.id === document.userId) {
                return true;
            }
            // Admins can read all profiles
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Users can update their own profile (limited fields)
            if (user && document && user.id === document.userId) {
                // Prevent role changes by users
                const allowedFields = ['name', 'phone', 'notificationPreferences'];
                return true;
            }
            // Admins can update any profile
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        delete: (user, document) => {
            // Users can delete their own account (soft delete)
            if (user && document && user.id === document.userId) {
                return true;
            }
            // Admins can delete any account
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        create: () => {
            // Anyone can create a user account (during signup)
            return true;
        }
    },
    
    // KYC collection
    [COLLECTION_IDS.KYC]: {
        read: (user, document) => {
            // Users can read their own KYC
            if (user && document && user.id === document.userId) {
                return true;
            }
            // Admins can read all KYC
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Users can only update their own pending KYC
            if (user && document && user.id === document.userId && document.status === 'not_started') {
                return true;
            }
            // Admins can update any KYC
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        delete: () => {
            // KYC records cannot be deleted, only updated
            return false;
        },
        create: (user) => {
            // Authenticated users can create KYC
            return user !== null;
        }
    },
    
    // Escrows collection
    [COLLECTION_IDS.ESCROWS]: {
        read: (user, document) => {
            // Users can read escrows they're party to
            if (user && document && (user.id === document.buyerId || user.id === document.sellerId)) {
                return true;
            }
            // Admins can read all escrows
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Buyers and sellers can update their own escrows (limited)
            if (user && document && (user.id === document.buyerId || user.id === document.sellerId)) {
                // Allow status updates and terms acceptance
                return true;
            }
            // Admins can update any escrow
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        delete: () => {
            // Escrows cannot be deleted, only cancelled
            return false;
        },
        create: (user) => {
            // Authenticated users with KYC can create escrows
            return user && user.kycStatus === 'verified';
        }
    },
    
    // Transactions collection
    [COLLECTION_IDS.TRANSACTIONS]: {
        read: (user, document) => {
            // Users can read their own transactions
            if (user && document && user.id === document.userId) {
                return true;
            }
            // Admins can read all transactions
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: () => {
            // Transactions are immutable after creation
            return false;
        },
        delete: () => {
            // Transactions cannot be deleted
            return false;
        },
        create: (user) => {
            // Authenticated users can create transactions
            return user !== null;
        }
    },
    
    // Disputes collection
    [COLLECTION_IDS.DISPUTES]: {
        read: (user, document) => {
            // Users can read disputes they're party to
            if (user && document) {
                // Need to check escrow participants
                return true; // Simplified for now
            }
            // Admins can read all disputes
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Only admins can update disputes
            return user && user.role === 'admin';
        },
        delete: () => {
            // Disputes cannot be deleted
            return false;
        },
        create: (user) => {
            // Authenticated users can create disputes
            return user !== null;
        }
    },
    
    // Notifications collection
    [COLLECTION_IDS.NOTIFICATIONS]: {
        read: (user, document) => {
            // Users can read their own notifications
            if (user && document && user.id === document.userId) {
                return true;
            }
            // Admins can read all notifications
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Users can mark their own notifications as read
            if (user && document && user.id === document.userId) {
                return true;
            }
            return false;
        },
        delete: () => {
            // Notifications cannot be deleted
            return false;
        },
        create: () => {
            // Only system can create notifications
            return false;
        }
    },
    
    // Invites collection
    [COLLECTION_IDS.INVITES]: {
        read: (user, document) => {
            // Users can read invites they sent or received
            if (user && document && (user.id === document.invitedBy || user.id === document.acceptedBy)) {
                return true;
            }
            // Admins can read all invites
            if (user && user.role === 'admin') {
                return true;
            }
            return false;
        },
        update: (user, document) => {
            // Users can cancel their own pending invites
            if (user && document && user.id === document.invitedBy && document.status === 'pending') {
                return true;
            }
            // Users can accept invites sent to them
            if (user && document && document.status === 'pending') {
                // Check if email/phone matches
                return true; // Simplified for now
            }
            return false;
        },
        delete: () => {
            // Invites cannot be deleted, only cancelled
            return false;
        },
        create: (user) => {
            // Authenticated users can create invites
            return user !== null;
        }
    }
};

// ============================================
// SECURITY VALIDATION FUNCTIONS
// ============================================

/**
 * Check if user has permission for specific action
 * @param {Object} user - User object
 * @param {string} permission - Permission key
 * @returns {boolean} Has permission
 */
export function hasPermission(user, permission) {
    if (!user) {
        return false;
    }
    
    const userRole = user.role || 'user';
    const rolePermissions = PERMISSIONS[userRole.toUpperCase()];
    
    return rolePermissions && rolePermissions[permission] === true;
}

/**
 * Validate access to collection resource
 * @param {string} collectionId - Collection ID
 * @param {string} action - Action (read/update/delete/create)
 * @param {Object} user - User object
 * @param {Object} document - Document (for read/update/delete)
 * @returns {boolean} Access granted
 */
export function validateAccess(collectionId, action, user, document = null) {
    const collectionRules = ACCESS_RULES[collectionId];
    
    if (!collectionRules) {
        console.warn(`No access rules defined for collection: ${collectionId}`);
        return false;
    }
    
    const actionRule = collectionRules[action];
    
    if (!actionRule) {
        console.warn(`No ${action} rule defined for collection: ${collectionId}`);
        return false;
    }
    
    if (typeof actionRule === 'function') {
        return actionRule(user, document);
    }
    
    return actionRule === true;
}

/**
 * Validate escrow operation permissions
 * @param {Object} user - User object
 * @param {Object} escrow - Escrow object
 * @param {string} operation - Operation type
 * @returns {Object} Validation result
 */
export function validateEscrowOperation(user, escrow, operation) {
    if (!user || !escrow) {
        return { valid: false, reason: "User or escrow not provided" };
    }
    
    // Check if user is party to escrow
    const isParty = user.id === escrow.buyerId || user.id === escrow.sellerId;
    const isAdmin = user.role === 'admin';
    
    if (!isParty && !isAdmin) {
        return { valid: false, reason: "Access denied - not a party to escrow" };
    }
    
    // Validate specific operations
    switch (operation) {
        case 'fund':
            if (user.id !== escrow.buyerId) {
                return { valid: false, reason: "Only buyer can fund escrow" };
            }
            if (escrow.status !== 'pending') {
                return { valid: false, reason: "Escrow must be in pending status" };
            }
            break;
            
        case 'mark_delivered':
            if (user.id !== escrow.sellerId) {
                return { valid: false, reason: "Only seller can mark as delivered" };
            }
            if (escrow.status !== 'in_progress') {
                return { valid: false, reason: "Escrow must be in progress" };
            }
            break;
            
        case 'accept_delivery':
            if (user.id !== escrow.buyerId) {
                return { valid: false, reason: "Only buyer can accept delivery" };
            }
            if (escrow.status !== 'delivered') {
                return { valid: false, reason: "Escrow must be delivered to accept" };
            }
            break;
            
        case 'cancel':
            if (!isAdmin && escrow.status !== 'pending' && escrow.status !== 'funded') {
                return { valid: false, reason: "Only pending or funded escrows can be cancelled" };
            }
            break;
            
        case 'raise_dispute':
            if (!['in_progress', 'delivered'].includes(escrow.status)) {
                return { valid: false, reason: "Escrow cannot be disputed in current status" };
            }
            break;
    }
    
    return { valid: true };
}

/**
 * Validate KYC requirements for operations
 * @param {Object} user - User object
 * @param {string} operation - Operation requiring KYC
 * @returns {Object} Validation result
 */
export function validateKYCRequirements(user, operation) {
    if (!user) {
        return { valid: false, reason: "User not authenticated" };
    }
    
    const kycRequiredOperations = ['create_escrow', 'fund_escrow', 'sell_in_escrow'];
    
    if (kycRequiredOperations.includes(operation)) {
        if (user.kycStatus !== 'verified') {
            return { 
                valid: false, 
                reason: "KYC verification required for this operation",
                kycStatus: user.kycStatus
            };
        }
    }
    
    return { valid: true };
}

/**
 * Sanitize input data to prevent XSS and injection
 * @param {any} data - Input data
 * @returns {any} Sanitized data
 */
export function sanitizeInput(data) {
    if (typeof data === 'string') {
        // Basic XSS prevention
        return data
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim();
    }
    
    if (Array.isArray(data)) {
        return data.map(sanitizeInput);
    }
    
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }
    
    return data;
}

/**
 * Rate limiting helper (client-side)
 * @param {string} action - Action identifier
 * @param {number} limitMs - Time limit in milliseconds
 * @returns {boolean} Action allowed
 */
export function checkRateLimit(action, limitMs = 1000) {
    const storageKey = `rate_limit_${action}`;
    const lastExecution = localStorage.getItem(storageKey);
    
    if (lastExecution) {
        const timeSinceLast = Date.now() - parseInt(lastExecution);
        if (timeSinceLast < limitMs) {
            return false;
        }
    }
    
    localStorage.setItem(storageKey, Date.now().toString());
    return true;
}

/**
 * Validate file upload security
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFileUpload(file, options = {}) {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
        maxFiles = 5
    } = options;
    
    if (!file) {
        return { valid: false, reason: "No file provided" };
    }
    
    // Check file size
    if (file.size > maxSize) {
        return { 
            valid: false, 
            reason: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` 
        };
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return { 
            valid: false, 
            reason: `File type ${file.type} not allowed` 
        };
    }
    
    // Check file name for suspicious patterns
    const suspiciousPatterns = [/\.\./, /[<>:"|?*]/, /\.exe$/i, /\.bat$/i, /\.cmd$/i];
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(file.name)) {
            return { 
                valid: false, 
                reason: "File name contains suspicious characters" 
            };
        }
    }
    
    return { valid: true };
}

/**
 * Security middleware for API calls
 * @param {Function} handler - API handler function
 * @param {Object} options - Security options
 * @returns {Function} Wrapped handler
 */
export function withSecurity(handler, options = {}) {
    return async (...args) => {
        try {
            // Get current user
            const user = await getCurrentUser();
            
            // Check authentication if required
            if (options.requireAuth && !user) {
                return { success: false, error: "Authentication required" };
            }
            
            // Check role if required
            if (options.requiredRole && (!user || user.role !== options.requiredRole)) {
                return { success: false, error: `${options.requiredRole} access required` };
            }
            
            // Check KYC if required
            if (options.requireKYC && (!user || user.kycStatus !== 'verified')) {
                return { success: false, error: "KYC verification required" };
            }
            
            // Rate limiting
            if (options.rateLimit) {
                const actionName = options.actionName || 'api_call';
                if (!checkRateLimit(actionName, options.rateLimit)) {
                    return { success: false, error: "Too many requests. Please try again later." };
                }
            }
            
            // Call the original handler
            return await handler(...args);
            
        } catch (error) {
            console.error("Security middleware error:", error);
            return { success: false, error: "Security validation failed" };
        }
    };
}

export default {
    PERMISSIONS,
    ACCESS_RULES,
    hasPermission,
    validateAccess,
    validateEscrowOperation,
    validateKYCRequirements,
    sanitizeInput,
    checkRateLimit,
    validateFileUpload,
    withSecurity
};
