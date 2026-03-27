/**
 * TrustPay KE - M-Pesa STK Push Appwrite Function
 * 
 * This function handles M-Pesa STK Push requests securely
 * Environment variables required:
 * - MPESA_CONSUMER_KEY: Safaricom API Consumer Key
 * - MPESA_CONSUMER_SECRET: Safaricom API Consumer Secret  
 * - MPESA_PASSKEY: Safaricom STK Push Passkey
 * - MPESA_ENVIRONMENT: sandbox or production
 */

const https = require('https');

// M-Pesa Configuration
const MPESA_CONFIG = {
    CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
    CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
    PASSKEY: process.env.MPESA_PASSKEY,
    BUSINESS_SHORT_CODE: "542542",
    PARTYB: "542542",
    ACCOUNT_REFERENCE: "TrustPay",
    TRANSACTION_DESC: "TrustPay Escrow Payment",
    CALLBACK_URL: process.env.MPESA_CALLBACK_URL || "https://fra.cloud.appwrite.io/v1/functions/mpesa-callback",
    TIMEOUT_URL: process.env.MPESA_TIMEOUT_URL || "https://fra.cloud.appwrite.io/v1/functions/mpesa-timeout",
    RESULT_URL: process.env.MPESA_RESULT_URL || "https://fra.cloud.appwrite.io/v1/functions/mpesa-result"
};

// API URLs
const API_URLS = {
    sandbox: {
        oauth: "https://sandbox.safaricom.co.ke/oauth/v1/generate",
        stkpush: "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    },
    production: {
        oauth: "https://api.safaricom.co.ke/oauth/v1/generate",
        stkpush: "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    }
};

/**
 * Get OAuth token from Safaricom
 */
async function getOAuthToken() {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${MPESA_CONFIG.CONSUMER_KEY}:${MPESA_CONFIG.CONSUMER_SECRET}`).toString('base64');
        
        const options = {
            hostname: API_URLS[process.env.MPESA_ENVIRONMENT || 'sandbox'].oauth,
            path: '/oauth/v1/generate?grant_type=client_credentials',
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('Failed to get OAuth token'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Initiate STK Push request
 */
async function initiateSTKPush(token, requestData) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${MPESA_CONFIG.BUSINESS_SHORT_CODE}${MPESA_CONFIG.PASSKEY}${timestamp}`).toString('base64');

        const payload = {
            BusinessShortCode: MPESA_CONFIG.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: requestData.amount,
            PartyA: requestData.phone,
            PartyB: MPESA_CONFIG.PARTYB,
            PhoneNumber: requestData.phone,
            CallBackURL: MPESA_CONFIG.CALLBACK_URL,
            AccountReference: requestData.accountReference,
            TransactionDesc: requestData.transactionDesc
        };

        const options = {
            hostname: API_URLS[process.env.MPESA_ENVIRONMENT || 'sandbox'].stkpush,
            path: '/mpesa/stkpush/v1/processrequest',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

/**
 * Main function handler
 */
export default async ({ req, res, error, log }) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.json({ error: 'Method not allowed' }, 405);
        }

        const requestData = JSON.parse(req.body);

        // Validate required fields
        const { escrowId, transactionId, amount, phone, accountReference, transactionDesc } = requestData;
        
        if (!escrowId || !transactionId || !amount || !phone) {
            return res.json({ error: 'Missing required fields' }, 400);
        }

        // Validate phone format
        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.json({ error: 'Invalid phone format' }, 400);
        }

        // Validate amount
        if (amount < 100 || amount > 1000000) {
            return res.json({ error: 'Invalid amount' }, 400);
        }

        log(`Initiating STK Push for transaction ${transactionId}`);

        // Get OAuth token
        const token = await getOAuthToken();
        log('OAuth token obtained successfully');

        // Initiate STK Push
        const stkResponse = await initiateSTKPush(token, {
            amount: amount,
            phone: phone,
            accountReference: accountReference || `ESCROW-${escrowId}`,
            transactionDesc: transactionDesc || `TrustPay Escrow Payment - ${escrowId}`
        });

        log('STK Push initiated:', JSON.stringify(stkResponse));

        if (stkResponse.ResponseCode === '0') {
            return res.json({
                success: true,
                CheckoutRequestID: stkResponse.CheckoutRequestID,
                MerchantRequestID: stkResponse.MerchantRequestID,
                CustomerMessage: stkResponse.CustomerMessage,
                message: 'STK Push initiated successfully'
            });
        } else {
            return res.json({
                success: false,
                error: stkResponse.errorMessage || 'Failed to initiate STK Push',
                ResponseCode: stkResponse.ResponseCode
            }, 400);
        }

    } catch (err) {
        log('Error in STK Push function:', err);
        return res.json({ 
            error: 'Internal server error',
            details: err.message 
        }, 500);
    }
};
