/**
 * TrustPay KE - M-Pesa Integration Module
 * 
 * This module handles M-Pesa STK Push integration for payments.
 * Currently a placeholder - full implementation requires:
 * 1. Safaricom Daraja API credentials
 * 2. Backend service for OAuth token generation
 * 3. Server-side callback handler
 * 
 * NOTE: M-Pesa payments cannot be initiated purely client-side
 * due to security requirements (API secrets must not be exposed)
 * 
 * This requires a backend service (can use Appwrite Functions)
 */

// M-Pesa API Configuration
const MpesaConfig = {
    // These would come from environment variables in production
    CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || "YOUR_CONSUMER_KEY",
    CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || "YOUR_CONSUMER_SECRET",
    BUSINESS_SHORT_CODE: "542542", // Paybill number
    PASSKEY: process.env.MPESA_PASSKEY || "YOUR_PASSKEY",
    SANDBOX_URL: "https://sandbox.safaricom.co.ke",
    PRODUCTION_URL: "https://api.safaricom.co.ke",
    CALLBACK_URL: "https://your-domain.com/api/mpesa/callback"
};

/**
 * Initiate M-Pesa STK Push payment
 * 
 * SECURITY NOTE: This function requires a backend service to:
 * 1. Get OAuth token from Safaricom
 * 2. Initiate STK push request
 * 3. Handle callback
 * 
 * @param {number} amount - Amount to pay (KES)
 * @param {string} phone - Phone number (254XXXXXXXXX format)
 * @param {string} transactionId - TrustPay transaction ID
 * @param {string} description - Payment description
 * @returns {Object} Result with payment request or error
 */
export async function initiateMpesaPayment(amount, phone, transactionId, description = "") {
    try {
        // Validate inputs
        if (!amount || amount < 1) {
            return { success: false, error: "Invalid amount. Minimum is KES 1" };
        }

        // Validate phone format (Kenyan)
        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return { 
                success: false, 
                error: "Invalid phone number. Use format: 254XXXXXXXXX" 
            };
        }

        // ============================================
        // BACKEND IMPLEMENTATION REQUIRED HERE
        // ============================================
        // 
        // This is a placeholder. In production, make a request to your backend:
        //
        // const response = await fetch('YOUR_BACKEND_API/mpesa/stkpush', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         amount: amount,
        //         phone: phone,
        //         transactionId: transactionId,
        //         callbackUrl: MpesaConfig.CALLBACK_URL
        //     })
        // });
        //
        // const data = await response.json();
        // return data;

        // Placeholder response
        return {
            success: true,
            message: "M-Pesa integration placeholder",
            instruction: `Would initiate STK Push for KES ${amount} to ${phone}`,
            note: "Backend implementation required"
        };

    } catch (error) {
        console.error("M-Pesa payment error:", error);
        return { success: false, error: error.message || "Failed to initiate payment" };
    }
}

/**
 * Check M-Pesa payment status
 * 
 * @param {string} checkoutRequestId - Checkout request ID from STK push
 * @returns {Object} Payment status
 */
export async function checkMpesaPaymentStatus(checkoutRequestId) {
    // ============================================
    // BACKEND IMPLEMENTATION REQUIRED HERE
    // ============================================
    
    return {
        success: false,
        error: "Backend implementation required for payment status check"
    };
}

/**
 * Process M-Pesa callback (called from backend)
 * 
 * This function should be called by your backend when Safaricom
 * sends the payment confirmation callback.
 * 
 * @param {Object} callbackData - Safaricom callback data
 * @returns {Object} Processed result
 */
export function processMpesaCallback(callbackData) {
    try {
        // Parse callback
        const { Body } = callbackData;
        const resultCode = Body?.stkCallback?.ResultCode;
        const resultDesc = Body?.stkCallback?.ResultDesc;
        
        if (resultCode === 0) {
            // Success
            const items = Body.stkCallback.CallbackMetadata?.Item || [];
            const getValue = (name) => items.find(i => i.Name === name)?.Value;
            
            return {
                success: true,
                payment: {
                    amount: getValue("Amount"),
                    mpesaReceipt: getValue("MpesaReceiptNumber"),
                    balance: getValue("Balance"),
                    transactionDate: getValue("TransactionDate"),
                    phone: getValue("PhoneNumber"),
                    resultCode: resultCode,
                    resultDesc: resultDesc
                }
            };
        } else {
            // Failed
            return {
                success: false,
                error: resultDesc || "Payment failed",
                resultCode: resultCode
            };
        }

    } catch (error) {
        console.error("Process M-Pesa callback error:", error);
        return { success: false, error: "Failed to process callback" };
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
