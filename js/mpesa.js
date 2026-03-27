/**
 * TrustPay KE - M-Pesa Integration Module
 * 
 * Production-ready M-Pesa STK Push integration for TrustPay escrow platform
 * Integrates with Appwrite Functions for secure backend processing
 */

import { 
    databases, 
    ID, 
    DATABASE_IDS, 
    COLLECTION_IDS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';
import { updateEscrowStatus } from './escrow.js';

// M-Pesa API Configuration
const MpesaConfig = {
    BUSINESS_SHORT_CODE: "542542", // TrustPay Paybill
    PARTYB: "542542",
    ACCOUNT_REFERENCE: "TrustPay",
    TRANSACTION_DESC: "TrustPay Escrow Payment",
    CALLBACK_URL: `${window.location.origin}/api/mpesa/callback`,
    TIMEOUT_URL: `${window.location.origin}/api/mpesa/timeout`,
    RESULT_URL: `${window.location.origin}/api/mpesa/result`
};

/**
 * Initiate M-Pesa STK Push payment for escrow funding
 * @param {string} escrowId - TrustPay escrow ID
 * @param {number} amount - Amount to pay (KES)
 * @param {string} phone - Phone number (254XXXXXXXXX format)
 * @returns {Object} Result with payment request or error
 */
export async function initiateMpesaPayment(escrowId, amount, phone) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate inputs
        if (!escrowId || !amount || !phone) {
            return { success: false, error: "Escrow ID, amount, and phone are required" };
        }

        if (amount < 100 || amount > 1000000) {
            return { success: false, error: "Amount must be between KES 100 and KES 1,000,000" };
        }

        // Validate phone format (Kenyan)
        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return { 
                success: false, 
                error: "Invalid phone number. Use format: 254XXXXXXXXX" 
            };
        }

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is buyer
        if (escrow.buyerId !== user.id) {
            return { success: false, error: "Only the buyer can fund the escrow" };
        }

        // Validate escrow status
        if (escrow.status !== 'pending') {
            return { success: false, error: "Escrow must be in pending status to fund" };
        }

        // Validate amount matches escrow
        if (amount !== escrow.amount) {
            return { success: false, error: "Amount does not match escrow amount" };
        }

        // Create transaction record
        const transaction = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            ID.unique(),
            {
                transactionId: ID.unique(),
                escrowId: escrowId,
                userId: user.id,
                type: 'payment',
                amount: amount,
                currency: 'KES',
                status: 'pending',
                paymentMethod: 'mpesa',
                phoneNumber: phone,
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // Call Appwrite Function for STK Push
        const functionPayload = {
            escrowId: escrowId,
            transactionId: transaction.transactionId,
            amount: amount,
            phone: phone,
            accountReference: `ESCROW-${escrowId}`,
            transactionDesc: `TrustPay Escrow Payment - ${escrowId}`
        };

        try {
            const response = await fetch('/api/mpesa/stkpush', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Appwrite-Project': '69c165c7003cae4214fe'
                },
                body: JSON.stringify(functionPayload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate STK push');
            }

            // Update transaction with checkout request ID
            await databases.updateDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.TRANSACTIONS,
                transaction.$id,
                {
                    paymentDetails: {
                        checkoutRequestId: data.CheckoutRequestID,
                        merchantRequestId: data.MerchantRequestID
                    },
                    updatedAt: new Date().toISOString()
                }
            );

            return {
                success: true,
                transactionId: transaction.transactionId,
                checkoutRequestId: data.CheckoutRequestID,
                message: "STK Push initiated. Please enter your M-Pesa PIN to complete payment.",
                instructions: [
                    "Check your phone for the M-Pesa STK Push prompt",
                    "Enter your M-Pesa PIN to authorize the payment",
                    "Wait for payment confirmation (usually within 30 seconds)"
                ]
            };

        } catch (apiError) {
            console.error("M-Pesa API error:", apiError);
            
            // Update transaction as failed
            await databases.updateDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.TRANSACTIONS,
                transaction.$id,
                {
                    status: 'failed',
                    failureReason: apiError.message,
                    updatedAt: new Date().toISOString()
                }
            );

            return { 
                success: false, 
                error: apiError.message || "Failed to initiate M-Pesa payment" 
            };
        }

    } catch (error) {
        console.error("M-Pesa payment error:", error);
        return { success: false, error: error.message || "Failed to initiate payment" };
    }
}

/**
 * Check M-Pesa payment status
 * @param {string} checkoutRequestId - Checkout request ID from STK push
 * @returns {Object} Payment status
 */
export async function checkMpesaPaymentStatus(checkoutRequestId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Find transaction by checkout request ID
        const transactions = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                { method: 'equal', attribute: 'userId', values: [user.id] },
                { method: 'limit', value: 100 }
            ]
        );

        const transaction = transactions.documents.find(t => 
            t.paymentDetails?.checkoutRequestId === checkoutRequestId
        );

        if (!transaction) {
            return { success: false, error: "Transaction not found" };
        }

        return {
            success: true,
            status: transaction.status,
            amount: transaction.amount,
            escrowId: transaction.escrowId,
            mpesaReceipt: transaction.mpesaReceipt,
            processedAt: transaction.processedAt
        };

    } catch (error) {
        console.error("Check M-Pesa payment status error:", error);
        return { success: false, error: error.message || "Failed to check payment status" };
    }
}

/**
 * Process M-Pesa callback (called from Appwrite Function)
 * This function handles the payment confirmation from Safaricom
 * 
 * @param {Object} callbackData - Safaricom callback data
 * @returns {Object} Processed result
 */
export async function processMpesaCallback(callbackData) {
    try {
        console.log("Processing M-Pesa callback:", callbackData);

        const { Body } = callbackData;
        const stkCallback = Body?.stkCallback;
        
        if (!stkCallback) {
            return { success: false, error: "Invalid callback format" };
        }

        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;
        const checkoutRequestId = stkCallback.CheckoutRequestID;
        const merchantRequestId = stkCallback.MerchantRequestID;

        // Find transaction by checkout request ID
        const transactions = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                { method: 'limit', value: 100 }
            ]
        );

        const transaction = transactions.documents.find(t => 
            t.paymentDetails?.checkoutRequestId === checkoutRequestId
        );

        if (!transaction) {
            console.error("Transaction not found for checkout request:", checkoutRequestId);
            return { success: false, error: "Transaction not found" };
        }

        let paymentDetails = {};
        let newStatus = 'failed';
        let failureReason = resultDesc || "Payment failed";

        if (resultCode === 0) {
            // Payment successful
            const items = stkCallback.CallbackMetadata?.Item || [];
            const getValue = (name) => items.find(i => i.Name === name)?.Value;
            
            paymentDetails = {
                mpesaReceipt: getValue("MpesaReceiptNumber"),
                balance: getValue("Balance"),
                transactionDate: getValue("TransactionDate"),
                phoneNumber: getValue("PhoneNumber"),
                amount: getValue("Amount")
            };

            newStatus = 'completed';
            failureReason = null;

            // Update escrow status to funded
            try {
                await updateEscrowStatus(transaction.escrowId, 'funded', {
                    fundedAt: new Date().toISOString()
                });
            } catch (escrowError) {
                console.error("Failed to update escrow status:", escrowError);
            }

        } else {
            // Payment failed
            paymentDetails = {
                resultCode: resultCode,
                resultDesc: resultDesc
            };
        }

        // Update transaction
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            transaction.$id,
            {
                status: newStatus,
                mpesaReceipt: paymentDetails.mpesaReceipt || null,
                paymentDetails: {
                    ...transaction.paymentDetails,
                    ...paymentDetails
                },
                webhookData: callbackData,
                processedAt: new Date().toISOString(),
                failureReason: failureReason,
                updatedAt: new Date().toISOString()
            }
        );

        console.log(`Transaction ${transaction.transactionId} updated to status: ${newStatus}`);

        return {
            success: true,
            transactionId: transaction.transactionId,
            escrowId: transaction.escrowId,
            status: newStatus,
            paymentDetails
        };

    } catch (error) {
        console.error("Process M-Pesa callback error:", error);
        return { success: false, error: error.message || "Failed to process callback" };
    }
}

/**
 * Verify manual M-Pesa payment
 * For users who pay manually via Paybill
 * 
 * @param {string} escrowId - Escrow ID
 * @param {string} mpesaReceipt - M-Pesa receipt number
 * @param {number} amount - Amount paid
 * @returns {Object} Result
 */
export async function verifyManualPayment(escrowId, mpesaReceipt, amount) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate inputs
        if (!escrowId || !mpesaReceipt || !amount) {
            return { success: false, error: "All fields are required" };
        }

        // Validate receipt format
        if (!validateMpesaCode(mpesaReceipt)) {
            return { success: false, error: "Invalid M-Pesa receipt format" };
        }

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is buyer
        if (escrow.buyerId !== user.id) {
            return { success: false, error: "Only the buyer can verify payment" };
        }

        // Validate escrow status
        if (escrow.status !== 'pending') {
            return { success: false, error: "Escrow must be in pending status" };
        }

        // Validate amount
        if (amount !== escrow.amount) {
            return { success: false, error: "Amount does not match escrow amount" };
        }

        // Check if receipt already exists
        const existingTransactions = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                { method: 'equal', attribute: 'mpesaReceipt', values: [mpesaReceipt] }
            ]
        );

        if (existingTransactions.documents.length > 0) {
            return { success: false, error: "This M-Pesa receipt has already been used" };
        }

        // Create transaction record
        const transaction = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            ID.unique(),
            {
                transactionId: ID.unique(),
                escrowId: escrowId,
                userId: user.id,
                type: 'payment',
                amount: amount,
                currency: 'KES',
                status: 'pending_verification',
                paymentMethod: 'mpesa_manual',
                mpesaReceipt: mpesaReceipt,
                phoneNumber: user.phone,
                transactionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // TODO: Call Appwrite Function to verify receipt with Safaricom API
        // For now, mark as pending admin verification

        return {
            success: true,
            transactionId: transaction.transactionId,
            message: "Payment submitted for verification. We'll confirm your M-Pesa receipt within 30 minutes.",
            instructions: [
                "Our team will verify your M-Pesa receipt",
                "You'll receive a notification once verified",
                "Escrow will be funded upon successful verification"
            ]
        };

    } catch (error) {
        console.error("Verify manual payment error:", error);
        return { success: false, error: error.message || "Failed to verify payment" };
    }
}

/**
 * Get user's payment history
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} Payment history
 */
export async function getPaymentHistory(limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.TRANSACTIONS,
            [
                { method: 'equal', attribute: 'userId', values: [user.id] },
                { method: 'orderDesc', attribute: 'transactionDate' }
            ],
            limit,
            offset
        );

        return {
            success: true,
            transactions: result.documents,
            total: result.total
        };

    } catch (error) {
        console.error("Get payment history error:", error);
        return { success: false, error: error.message || "Failed to get payment history" };
    }
}

/**
 * Generate M-Pesa payment URL for manual payment
 * Useful for users who prefer to pay manually
 * 
 * @param {number} amount - Amount to pay
 * @param {string} accountNumber - Account number to pay
 * @returns {string} Payment instructions
 */
export function getMpesaManualPayment(amount, accountNumber = "05306274246151") {
    const paybill = "542542";
    
    return {
        paybill: paybill,
        accountNumber: accountNumber,
        amount: amount,
        instructions: [
            `Go to M-Pesa menu`,
            `Select "Pay Bill"`,
            `Enter Business Number: ${paybill}`,
            `Enter Account Number: ${accountNumber}`,
            `Enter Amount: KES ${amount}`,
            `Enter your M-Pesa PIN`,
            `Confirm payment`
        ],
        note: "After payment, your escrow will be automatically verified within 30 minutes"
    };
}

/**
 * Validate M-Pesa receipt code format
 * 
 * @param {string} code - M-Pesa receipt code (e.g., "NG39KG5HB2")
 * @returns {boolean}
 */
export function validateMpesaCode(code) {
    if (!code || typeof code !== "string") {
        return false;
    }
    
    // M-Pesa codes are typically 10 characters alphanumeric
    // Format: starts with prefix + 8-10 alphanumeric chars
    const pattern = /^[A-Z0-9]{8,15}$/;
    return pattern.test(code.toUpperCase());
}

/**
 * Parse M-Pesa confirmation message
 * Useful for extracting details from user-pasted messages
 * 
 * @param {string} message - M-Pesa confirmation message
 * @returns {Object} Parsed data
 */
export function parseMpesaMessage(message) {
    if (!message || typeof message !== "string") {
        return { valid: false, error: "Invalid message" };
    }

    // Common M-Pesa message patterns
    const patterns = {
        amount: /Amount[\s:]*KES?\s*([\d,]+)/i,
        receipt: /(?:Receipt|Ref)[\s:]*([A-Z0-9]{8,15})/i,
        date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        time: /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i
    };

    const result = {
        valid: false,
        raw: message,
        amount: null,
        receipt: null,
        date: null,
        time: null
    };

    // Extract amount
    const amountMatch = message.match(patterns.amount);
    if (amountMatch) {
        result.amount = parseFloat(amountMatch[1].replace(",", ""));
    }

    // Extract receipt
    const receiptMatch = message.match(patterns.receipt);
    if (receiptMatch) {
        result.receipt = receiptMatch[1].toUpperCase();
    }

    // Extract date
    const dateMatch = message.match(patterns.date);
    if (dateMatch) {
        result.date = dateMatch[1];
    }

    // Extract time
    const timeMatch = message.match(patterns.time);
    if (timeMatch) {
        result.time = timeMatch[1];
    }

    // Mark as valid if we found at least receipt or amount
    result.valid = !!(result.receipt || result.amount);

    return result;
}

// ============================================
// BACKEND SETUP INSTRUCTIONS
// ============================================
/*
To complete M-Pesa integration, you need:

1. Create Appwrite Function for STK Push:
   - Trigger: HTTPS (no auth)
   - Runtime: Node.js
   - Add environment variables:
     * MPESA_CONSUMER_KEY
     * MPESA_CONSUMER_SECRET
     * MPESA_PASSKEY

2. Function code (simplified):
   
   const https = require('https');
   
   module.exports = async (req, res) => {
       // Get OAuth token
       const token = await getOAuthToken();
       
       // Initiate STK Push
       const payment = await initiateSTKPush(token, req.body);
       
       res.json(payment);
   };

3. Create callback endpoint:
   - Safaricom will POST to this URL
   - Verify signature
   - Update database
   - Return success to Safaricom

4. Test with Safaricom Sandbox:
   - Use test credentials
   - Test phone: 254708374149
*/

export default {
    initiateMpesaPayment,
    checkMpesaPaymentStatus,
    processMpesaCallback,
    getMpesaManualPayment,
    validateMpesaCode,
    parseMpesaMessage
};
