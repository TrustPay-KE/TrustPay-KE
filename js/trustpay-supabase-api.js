// TrustPay API - Main Integration File using Supabase
import authSystem from './auth-supabase.js';
import escrowSystem from './escrow-supabase.js';

// Import other modules (will be created)
// import kycSystem from './kyc-supabase.js';
// import paymentSystem from './payment-supabase.js';
// import disputeSystem from './dispute-supabase.js';
// import notificationSystem from './notification-supabase.js';
// import inviteSystem from './invite-supabase.js';
// import adminSystem from './admin-supabase.js';

// Main TrustPay API class
class TrustPayAPI {
    constructor() {
        this.initialized = false;
        this.init();
    }

    // Initialize API
    async init() {
        try {
            // Wait for auth system to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.initialized = true;
            console.log('TrustPay API initialized successfully');
        } catch (error) {
            console.error('Error initializing TrustPay API:', error);
        }
    }

    // Authentication methods
    get auth() {
        return authSystem;
    }

    // Escrow methods
    get escrows() {
        return escrowSystem;
    }

    // KYC methods (placeholder)
    get kyc() {
        return {
            submitApplication: async (documents) => {
                // KYC implementation will be added
                return { success: false, message: 'KYC system coming soon' };
            },
            getStatus: async () => {
                const user = authSystem.getCurrentUser();
                return { status: user?.profile?.kyc_status || 'not_started' };
            }
        };
    }

    // Payment methods (placeholder)
    get payments() {
        return {
            initiatePayment: async (escrowId, amount, phoneNumber) => {
                // M-PESA implementation will be added
                return { success: false, message: 'Payment system coming soon' };
            },
            getStatus: async (transactionId) => {
                return { status: 'pending', message: 'Payment status check coming soon' };
            }
        };
    }

    // Dispute methods (placeholder)
    get disputes() {
        return {
            raiseDispute: async (escrowId, description, evidence) => {
                // Dispute implementation will be added
                return { success: false, message: 'Dispute system coming soon' };
            },
            getDispute: async (disputeId) => {
                return { success: false, message: 'Dispute system coming soon' };
            }
        };
    }

    // Notification methods (placeholder)
    get notifications() {
        return {
            getNotifications: async (userId) => {
                // Notification implementation will be added
                return { data: [], success: true };
            },
            markAsRead: async (notificationId) => {
                return { success: true, message: 'Notification marked as read' };
            }
        };
    }

    // Invite methods (placeholder)
    get invites() {
        return {
            createInvite: async (escrowId, email, phone, message) => {
                // Invite implementation will be added
                return { success: false, message: 'Invite system coming soon' };
            },
            acceptInvite: async (inviteCode) => {
                return { success: false, message: 'Invite system coming soon' };
            }
        };
    }

    // Admin methods (placeholder)
    get admin() {
        return {
            getDashboard: async () => {
                // Admin implementation will be added
                return { success: false, message: 'Admin system coming soon' };
            },
            getUsers: async () => {
                return { data: [], success: true };
            }
        };
    }

    // Utility methods
    async testConnection() {
        try {
            const { supabaseHelpers } = await import('./supabase.js');
            return await supabaseHelpers.testConnection();
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getCurrentUser() {
        return authSystem.getCurrentUser();
    }

    isLoggedIn() {
        return authSystem.isLoggedIn();
    }

    isAdmin() {
        return authSystem.isAdmin();
    }

    isVerified() {
        return authSystem.isVerified();
    }

    getKycStatus() {
        return authSystem.getKycStatus();
    }

    // File upload helper
    async uploadFile(bucket, file, path = null) {
        try {
            const { supabaseHelpers } = await import('./supabase.js');
            const fileName = path || `${Date.now()}_${file.name}`;
            
            const { data, error } = await supabaseHelpers.uploadFile(bucket, fileName, file);
            
            if (error) throw error;
            
            return {
                success: true,
                data,
                url: supabaseHelpers.getFileUrl(bucket, data.path)
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // File deletion helper
    async deleteFile(bucket, path) {
        try {
            const { supabaseHelpers } = await import('./supabase.js');
            const { error } = await supabaseHelpers.deleteFile(bucket, path);
            
            if (error) throw error;
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Format currency
    formatCurrency(amount, currency = 'KES') {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format date
    formatDate(date) {
        return new Intl.DateTimeFormat('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    // Validate email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate phone (Kenya format)
    validatePhone(phone) {
        const phoneRegex = /^(254|0)?[7]\d{8}$/;
        return phoneRegex.test(phone);
    }

    // Format phone number
    formatPhone(phone) {
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Convert to Kenya format
        if (cleaned.startsWith('254')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '254' + cleaned.substring(1);
        } else if (cleaned.startsWith('7')) {
            return '254' + cleaned;
        }
        
        return phone;
    }

    // Generate random string
    generateRandomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Error handler
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        if (error.code === 'PGRST116') {
            return { success: false, message: 'Record not found' };
        } else if (error.code === '23505') {
            return { success: false, message: 'Duplicate record' };
        } else if (error.code === '23514') {
            return { success: false, message: 'Invalid data provided' };
        } else if (error.code === '42501') {
            return { success: false, message: 'Permission denied' };
        } else {
            return { success: false, message: error.message || 'An error occurred' };
        }
    }

    // Loading states
    setLoading(element, loading = true) {
        if (element) {
            if (loading) {
                element.disabled = true;
                element.dataset.originalText = element.textContent;
                element.textContent = 'Loading...';
            } else {
                element.disabled = false;
                element.textContent = element.dataset.originalText || element.textContent;
            }
        }
    }

    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ffc107';
                notification.style.color = '#000';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Hide notification after duration
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }

    // Confirm dialog
    async confirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; text-align: center;">
                    <h3 style="margin: 0 0 20px 0; color: #333;">${title}</h3>
                    <p style="margin: 0 0 30px 0; color: #666;">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="confirm-yes" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">Yes</button>
                        <button id="confirm-no" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">No</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('confirm-yes').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });

            document.getElementById('confirm-no').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
        });
    }
}

// Create and export TrustPay API instance
const trustPayAPI = new TrustPayAPI();
export default trustPayAPI;

// Export individual systems for direct access
export { authSystem, escrowSystem };
