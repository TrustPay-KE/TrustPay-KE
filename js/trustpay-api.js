/**
 * TrustPay KE - Main API Integration
 * Single entry point for all TrustPay backend operations
 */

// Import all backend modules
import { 
    signupUser, 
    loginUser, 
    logoutUser, 
    getCurrentUser, 
    isAuthenticated,
    updatePassword,
    updateEmail,
    updateNotificationPreferences,
    deleteAccount,
    getActiveSessions,
    revokeSession,
    canCreateEscrow
} from './auth.js';

import { 
    submitKYC, 
    getKYCStatus, 
    approveKYC, 
    rejectKYC, 
    getPendingKYCApplications,
    deleteKYCDocuments,
    validateKYCForEscrow
} from './kyc.js';

import { 
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
} from './escrow.js';

import { 
    initiateMpesaPayment,
    checkMpesaPaymentStatus,
    processMpesaCallback,
    verifyManualPayment,
    getPaymentHistory,
    getMpesaManualPayment,
    validateMpesaCode,
    parseMpesaMessage
} from './mpesa.js';

import { 
    raiseDispute,
    getDispute,
    resolveDispute,
    getAllDisputes,
    getUserDisputes,
    updateDisputeStatus
} from './disputes.js';

import { 
    getDashboardStats,
    getAllUsers,
    updateUserStatus,
    updateUserRole,
    getPlatformSettings,
    updatePlatformSettings,
    getTransactionHistory,
    forceReleaseFunds,
    forceRefund
} from './admin.js';

import { 
    createInvite,
    acceptInvite,
    getInviteByCode,
    getUserInvites,
    cancelInvite,
    resendInvite,
    cleanupExpiredInvites
} from './invites.js';

import { 
    hasPermission,
    validateAccess,
    validateEscrowOperation,
    validateKYCRequirements,
    sanitizeInput,
    checkRateLimit,
    validateFileUpload,
    withSecurity
} from './security.js';

import { 
    DATABASE_IDS,
    COLLECTION_IDS,
    BUCKET_IDS,
    ESCROW_STATUS,
    KYC_STATUS,
    USER_ROLES
} from './appwrite.js';

/**
 * TrustPay API Class - Main interface for all operations
 */
class TrustPayAPI {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
    }

    /**
     * Initialize the API
     */
    async initialize() {
        try {
            console.log('🚀 Initializing TrustPay API...');
            
            // Check if user is already logged in
            const user = await getCurrentUser();
            if (user) {
                this.currentUser = user;
                console.log('✅ User already logged in:', user.email);
            }
            
            this.initialized = true;
            console.log('✅ TrustPay API initialized successfully');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to initialize TrustPay API:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    /**
     * Authentication methods
     */
    auth = {
        signup: signupUser,
        login: loginUser,
        logout: logoutUser,
        getCurrentUser: getCurrentUser,
        isAuthenticated: isAuthenticated,
        updatePassword: updatePassword,
        updateEmail: updateEmail,
        updateNotificationPreferences: updateNotificationPreferences,
        deleteAccount: deleteAccount,
        getActiveSessions: getActiveSessions,
        revokeSession: revokeSession,
        canCreateEscrow: canCreateEscrow
    };

    /**
     * KYC methods
     */
    kyc = {
        submit: submitKYC,
        getStatus: getKYCStatus,
        approve: approveKYC,
        reject: rejectKYC,
        getPendingApplications: getPendingKYCApplications,
        deleteDocuments: deleteKYCDocuments,
        validateForEscrow: validateKYCForEscrow
    };

    /**
     * Escrow methods
     */
    escrow = {
        create: createEscrow,
        get: getEscrow,
        acceptTerms: acceptEscrowTerms,
        updateStatus: updateEscrowStatus,
        markDelivered: markAsDelivered,
        acceptDelivery: acceptDelivery,
        releaseFunds: releaseFunds,
        cancel: cancelEscrow,
        getUserEscrows: getUserEscrows,
        getAllEscrows: getAllEscrows
    };

    /**
     * Payment methods
     */
    payment = {
        initiateMpesa: initiateMpesaPayment,
        checkStatus: checkMpesaPaymentStatus,
        processCallback: processMpesaCallback,
        verifyManual: verifyManualPayment,
        getHistory: getPaymentHistory,
        getManualInstructions: getMpesaManualPayment,
        validateCode: validateMpesaCode,
        parseMessage: parseMpesaMessage
    };

    /**
     * Dispute methods
     */
    dispute = {
        raise: raiseDispute,
        get: getDispute,
        resolve: resolveDispute,
        getAll: getAllDisputes,
        getUserDisputes: getUserDisputes,
        updateStatus: updateDisputeStatus
    };

    /**
     * Admin methods
     */
    admin = {
        getDashboardStats: getDashboardStats,
        getAllUsers: getAllUsers,
        updateUserStatus: updateUserStatus,
        updateUserRole: updateUserRole,
        getPlatformSettings: getPlatformSettings,
        updatePlatformSettings: updatePlatformSettings,
        getTransactionHistory: getTransactionHistory,
        forceReleaseFunds: forceReleaseFunds,
        forceRefund: forceRefund
    };

    /**
     * Invite methods
     */
    invite = {
        create: createInvite,
        accept: acceptInvite,
        getByCode: getInviteByCode,
        getUserInvites: getUserInvites,
        cancel: cancelInvite,
        resend: resendInvite,
        cleanupExpired: cleanupExpiredInvites
    };

    /**
     * Security methods
     */
    security = {
        hasPermission: hasPermission,
        validateAccess: validateAccess,
        validateEscrowOperation: validateEscrowOperation,
        validateKYCRequirements: validateKYCRequirements,
        sanitizeInput: sanitizeInput,
        checkRateLimit: checkRateLimit,
        validateFileUpload: validateFileUpload,
        withSecurity: withSecurity
    };

    /**
     * Constants
     */
    constants = {
        DATABASE_IDS,
        COLLECTION_IDS,
        BUCKET_IDS,
        ESCROW_STATUS,
        KYC_STATUS,
        USER_ROLES
    };
}

// Create and export singleton instance
const trustPayAPI = new TrustPayAPI();

// Auto-initialize when module loads
trustPayAPI.initialize();

export default trustPayAPI;

// Also export individual modules for direct access
export {
    // Auth
    signupUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    isAuthenticated,
    
    // KYC
    submitKYC,
    getKYCStatus,
    
    // Escrow
    createEscrow,
    getEscrow,
    getUserEscrows,
    
    // Payment
    initiateMpesaPayment,
    checkMpesaPaymentStatus,
    
    // Dispute
    raiseDispute,
    getDispute,
    
    // Admin
    getDashboardStats,
    
    // Security
    validateFileUpload,
    sanitizeInput
};

// Global access for debugging
if (typeof window !== 'undefined') {
    window.TrustPayAPI = trustPayAPI;
    window.TrustPayConstants = trustPayAPI.constants;
}
