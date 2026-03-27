/**
 * TrustPay KE - M-Pesa Callback Handler
 * 
 * This function handles M-Pesa payment callbacks from Safaricom
 * Updates transaction records and escrow status
 */

import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69c165c7003cae4214fe');

const databases = new Databases(client);

// Database configuration
const DATABASE_ID = 'trustpay_main';
const TRANSACTIONS_COLLECTION = 'transactions';
const ESCROWS_COLLECTION = 'escrows';

/**
 * Find transaction by checkout request ID
 */
async function findTransactionByCheckoutId(checkoutRequestId) {
    try {
        // List recent transactions (limited search for performance)
        const result = await databases.listDocuments(
            DATABASE_ID,
            TRANSACTIONS_COLLECTION,
            [
                { method: 'limit', value: 100 },
                { method: 'orderDesc', attribute: 'createdAt' }
            ]
        );

        // Find transaction with matching checkout request ID
        return result.documents.find(transaction => 
            transaction.paymentDetails?.checkoutRequestId === checkoutRequestId
        );
    } catch (error) {
        console.error('Error finding transaction:', error);
        throw error;
    }
}

/**
 * Update transaction status
 */
async function updateTransaction(transactionId, updateData) {
    try {
        return await databases.updateDocument(
            DATABASE_ID,
            TRANSACTIONS_COLLECTION,
            transactionId,
            updateData
        );
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

/**
 * Update escrow status to funded
 */
async function updateEscrowToFunded(escrowId) {
    try {
        return await databases.updateDocument(
            DATABASE_ID,
            ESCROWS_COLLECTION,
            escrowId,
            {
                status: 'funded',
                fundedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );
    } catch (error) {
        console.error('Error updating escrow:', error);
        throw error;
    }
}

/**
 * Main callback handler
 */
export default async ({ req, res, error, log }) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.json({ error: 'Method not allowed' }, 405);
        }

        const callbackData = JSON.parse(req.body);
        log('Received M-Pesa callback:', JSON.stringify(callbackData));

        const { Body } = callbackData;
        const stkCallback = Body?.stkCallback;

        if (!stkCallback) {
            log('Invalid callback format - missing stkCallback');
            return res.json({ ResultCode: 1, ResultDesc: 'Invalid callback format' });
        }

        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;
        const checkoutRequestId = stkCallback.CheckoutRequestID;
        const merchantRequestId = stkCallback.MerchantRequestID;

        log(`Processing callback for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}`);

        // Find the transaction
        const transaction = await findTransactionByCheckoutId(checkoutRequestId);
        
        if (!transaction) {
            log(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}`);
            return res.json({ ResultCode: 1, ResultDesc: 'Transaction not found' });
        }

        log(`Found transaction: ${transaction.transactionId}`);

        let updateData = {
            webhookData: callbackData,
            processedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (resultCode === 0) {
            // Payment successful
            log('Payment successful - processing success callback');

            const items = stkCallback.CallbackMetadata?.Item || [];
            const getValue = (name) => items.find(i => i.Name === name)?.Value;

            const paymentDetails = {
                mpesaReceipt: getValue("MpesaReceiptNumber"),
                balance: getValue("Balance"),
                transactionDate: getValue("TransactionDate"),
                phoneNumber: getValue("PhoneNumber"),
                amount: getValue("Amount"),
                resultCode: resultCode,
                resultDesc: resultDesc
            };

            updateData = {
                ...updateData,
                status: 'completed',
                mpesaReceipt: paymentDetails.mpesaReceipt,
                paymentDetails: {
                    ...transaction.paymentDetails,
                    ...paymentDetails
                },
                failureReason: null
            };

            log('Updating transaction to completed status');

            // Update transaction
            await updateTransaction(transaction.$id, updateData);

            // Update escrow to funded status
            try {
                await updateEscrowToFunded(transaction.escrowId);
                log(`Escrow ${transaction.escrowId} updated to funded status`);
            } catch (escrowError) {
                log('Error updating escrow status:', escrowError);
                // Don't fail the callback if escrow update fails
            }

            // TODO: Send notification to user
            // TODO: Trigger any post-payment workflows

            log('Payment processing completed successfully');

        } else {
            // Payment failed
            log(`Payment failed: ${resultDesc}`);

            updateData = {
                ...updateData,
                status: 'failed',
                failureReason: resultDesc,
                paymentDetails: {
                    ...transaction.paymentDetails,
                    resultCode: resultCode,
                    resultDesc: resultDesc
                }
            };

            await updateTransaction(transaction.$id, updateData);

            // TODO: Send failure notification to user

            log('Payment failure processed');
        }

        // Return success response to Safaricom
        return res.json({ 
            ResultCode: 0, 
            ResultDesc: 'Callback processed successfully' 
        });

    } catch (err) {
        log('Error in M-Pesa callback handler:', err);
        
        // Return error response to Safaricom
        return res.json({ 
            ResultCode: 1, 
            ResultDesc: 'Internal server error' 
        });
    }
};
