/**
 * TrustPay KE - Notification System
 * 
 * This function handles sending notifications (email, SMS, in-app)
 * Triggered by various events in the system
 */

import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69c165c7003cae4214fe');

const databases = new Databases(client);

// Database configuration
const DATABASE_ID = 'trustpay_main';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

// Email templates
const EMAIL_TEMPLATES = {
    escrow_created: {
        subject: 'New Escrow Created - TrustPay',
        template: (data) => `
            <h2>New Escrow Created</h2>
            <p>Hello ${data.userName},</p>
            <p>A new escrow has been created with the following details:</p>
            <ul>
                <li><strong>Escrow ID:</strong> ${data.escrowId}</li>
                <li><strong>Amount:</strong> KES ${data.amount}</li>
                <li><strong>Description:</strong> ${data.description}</li>
                <li><strong>Created:</strong> ${new Date(data.createdAt).toLocaleString()}</li>
            </ul>
            <p>Please log in to your TrustPay dashboard to view the details.</p>
            <p>Thank you for using TrustPay!</p>
        `
    },
    payment_received: {
        subject: 'Payment Received - TrustPay',
        template: (data) => `
            <h2>Payment Received</h2>
            <p>Hello ${data.userName},</p>
            <p>We have received your payment for escrow ${data.escrowId}.</p>
            <ul>
                <li><strong>Amount:</strong> KES ${data.amount}</li>
                <li><strong>M-Pesa Receipt:</strong> ${data.mpesaReceipt}</li>
                <li><strong>Payment Date:</strong> ${new Date(data.paymentDate).toLocaleString()}</li>
            </ul>
            <p>Your escrow is now funded and ready for the seller to proceed.</p>
            <p>Thank you for using TrustPay!</p>
        `
    },
    funds_released: {
        subject: 'Funds Released - TrustPay',
        template: (data) => `
            <h2>Funds Released</h2>
            <p>Hello ${data.userName},</p>
            <p>Good news! The funds for escrow ${data.escrowId} have been released to you.</p>
            <ul>
                <li><strong>Amount:</strong> KES ${data.amount}</li>
                <li><strong>Release Date:</strong> ${new Date(data.releasedAt).toLocaleString()}</li>
            </ul>
            <p>The funds should reflect in your account shortly.</p>
            <p>Thank you for using TrustPay!</p>
        `
    },
    dispute_opened: {
        subject: 'Dispute Opened - TrustPay',
        template: (data) => `
            <h2>Dispute Opened</h2>
            <p>Hello ${data.userName},</p>
            <p>A dispute has been opened for escrow ${data.escrowId}.</p>
            <ul>
                <li><strong>Dispute ID:</strong> ${data.disputeId}</li>
                <li><strong>Reason:</strong> ${data.reason}</li>
                <li><strong>Opened By:</strong> ${data.openedBy}</li>
                <li><strong>Date:</strong> ${new Date(data.createdAt).toLocaleString()}</li>
            </ul>
            <p>Our team will review the dispute and take appropriate action.</p>
            <p>Thank you for using TrustPay!</p>
        `
    },
    kyc_approved: {
        subject: 'KYC Approved - TrustPay',
        template: (data) => `
            <h2>KYC Verification Approved</h2>
            <p>Hello ${data.userName},</p>
            <p>Congratulations! Your KYC verification has been approved.</p>
            <p>You can now create and participate in escrow transactions on TrustPay.</p>
            <p>Thank you for using TrustPay!</p>
        `
    },
    kyc_rejected: {
        subject: 'KYC Verification Update - TrustPay',
        template: (data) => `
            <h2>KYC Verification Update</h2>
            <p>Hello ${data.userName},</p>
            <p>Your KYC verification could not be approved at this time.</p>
            <p><strong>Reason:</strong> ${data.rejectionReason}</p>
            <p>Please review the feedback and submit your KYC documents again.</p>
            <p>Thank you for using TrustPay!</p>
        `
    }
};

/**
 * Send email notification
 */
async function sendEmail(toEmail, subject, htmlContent) {
    // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    // For now, just log the email
    console.log(`Email would be sent to ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${htmlContent}`);
    
    return { success: true, messageId: `email_${Date.now()}` };
}

/**
 * Send SMS notification
 */
async function sendSMS(toPhone, message) {
    // TODO: Integrate with SMS service (Twilio, Africa's Talking, etc.)
    // For now, just log the SMS
    console.log(`SMS would be sent to ${toPhone}`);
    console.log(`Message: ${message}`);
    
    return { success: true, messageId: `sms_${Date.now()}` };
}

/**
 * Create in-app notification
 */
async function createInAppNotification(userId, type, title, message, relatedId = null, relatedType = null) {
    try {
        const notification = await databases.createDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION,
            `notification_${Date.now()}`,
            {
                notificationId: `notification_${Date.now()}`,
                userId: userId,
                type: type,
                title: title,
                message: message,
                relatedId: relatedId,
                relatedType: relatedType,
                isRead: false,
                emailSent: false,
                smsSent: false,
                createdAt: new Date().toISOString()
            }
        );

        return { success: true, notification };
    } catch (error) {
        console.error('Error creating in-app notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user details
 */
async function getUserDetails(userId) {
    try {
        const user = await databases.getDocument(
            DATABASE_ID,
            USERS_COLLECTION,
            userId
        );
        return user;
    } catch (error) {
        console.error('Error getting user details:', error);
        throw error;
    }
}

/**
 * Send notification based on type
 */
async function sendNotification(type, data) {
    try {
        const { userId, relatedId, relatedType } = data;
        
        // Get user details
        const user = await getUserDetails(userId);
        
        // Get email template
        const template = EMAIL_TEMPLATES[type];
        if (!template) {
            console.error(`No email template found for type: ${type}`);
            return { success: false, error: 'Template not found' };
        }

        // Generate email content
        const emailContent = template.template({
            ...data,
            userName: user.name
        });

        // Create in-app notification
        const inAppResult = await createInAppNotification(
            userId,
            type,
            template.subject,
            emailContent.replace(/<[^>]*>/g, ''), // Strip HTML for in-app
            relatedId,
            relatedType
        );

        // Check user notification preferences
        const preferences = user.notificationPreferences || {
            email: true,
            sms: false,
            push: true
        };

        // Send email if enabled
        let emailResult = { success: true };
        if (preferences.email && user.email) {
            emailResult = await sendEmail(user.email, template.subject, emailContent);
        }

        // Send SMS if enabled and type is important
        let smsResult = { success: true };
        const importantTypes = ['payment_received', 'funds_released', 'dispute_opened'];
        if (preferences.sms && user.phone && importantTypes.includes(type)) {
            const smsMessage = `TrustPay: ${template.subject}. Check your dashboard for details.`;
            smsResult = await sendSMS(user.phone, smsMessage);
        }

        return {
            success: true,
            inApp: inAppResult,
            email: emailResult,
            sms: smsResult
        };

    } catch (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Main notification handler
 */
export default async ({ req, res, error, log }) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.json({ error: 'Method not allowed' }, 405);
        }

        const { type, data } = JSON.parse(req.body);
        
        if (!type || !data) {
            return res.json({ error: 'Type and data are required' }, 400);
        }

        log(`Sending notification type: ${type} for user: ${data.userId}`);

        const result = await sendNotification(type, data);

        if (result.success) {
            log('Notification sent successfully');
            return res.json(result);
        } else {
            log('Notification failed:', result.error);
            return res.json({ error: result.error }, 500);
        }

    } catch (err) {
        log('Error in notification handler:', err);
        return res.json({ error: 'Internal server error' }, 500);
    }
};
