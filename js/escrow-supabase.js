// Escrow Management System using Supabase
import { supabase, TABLES, BUCKETS, supabaseHelpers } from './supabase.js';
import authSystem from './auth-supabase.js';

class EscrowSystem {
    constructor() {
        this.currentUser = null;
        this.escrowListeners = [];
        this.init();
    }

    // Initialize escrow system
    async init() {
        // Listen for auth changes
        authSystem.addAuthListener((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
            }
        });

        // Set current user if already logged in
        const user = authSystem.getCurrentUser();
        if (user) {
            this.currentUser = user;
        }
    }

    // Create new escrow
    async createEscrow(escrowData) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to create an escrow' };
        }

        try {
            // Calculate platform fee (3% for Kenya market)
            const platformFee = escrowData.amount * 0.03;
            
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .insert({
                    buyer_id: this.currentUser.id,
                    seller_id: escrowData.sellerId || null,
                    amount: escrowData.amount,
                    currency: escrowData.currency || 'KES',
                    description: escrowData.description,
                    status: 'pending',
                    terms_accepted: false,
                    buyer_terms_accepted: false,
                    seller_terms_accepted: false,
                    platform_fee: platformFee,
                    platform_fee_percentage: 3.00,
                    proof_file_ids: [],
                    notes: escrowData.notes || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Create notification for seller if specified
            if (escrowData.sellerId) {
                await this.createNotification(escrowData.sellerId, 'escrow_created', 
                    'New Escrow Created', 
                    `You have been invited to participate in an escrow of KES ${escrowData.amount}`,
                    data.id,
                    'escrow'
                );
            }

            return {
                success: true,
                message: 'Escrow created successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Get escrow by ID
    async getEscrow(escrowId) {
        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .select(`
                    *,
                    buyer:buyer_id(id, name, email),
                    seller:seller_id(id, name, email)
                `)
                .eq('id', escrowId)
                .single();

            if (error) throw error;

            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Get user's escrows
    async getUserEscrows(status = null) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to view escrows' };
        }

        try {
            let query = supabase
                .from(TABLES.ESCROWS)
                .select(`
                    *,
                    buyer:buyer_id(id, name, email),
                    seller:seller_id(id, name, email)
                `)
                .or(`buyer_id.eq.${this.currentUser.id},seller_id.eq.${this.currentUser.id}`)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Update escrow status
    async updateEscrowStatus(escrowId, status, notes = null) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to update escrow' };
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update({
                    status,
                    notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Create notifications
            await this.notifyEscrowUpdate(data, status);

            return {
                success: true,
                message: 'Escrow status updated successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Accept escrow terms
    async acceptTerms(escrowId, partyType) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to accept terms' };
        }

        try {
            let updateData = {
                updated_at: new Date().toISOString()
            };

            if (partyType === 'buyer') {
                updateData.buyer_terms_accepted = true;
            } else if (partyType === 'seller') {
                updateData.seller_terms_accepted = true;
            }

            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update(updateData)
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Check if both parties have accepted terms
            if (data.buyer_terms_accepted && data.seller_terms_accepted) {
                await this.updateEscrowStatus(escrowId, 'in_progress');
            }

            return {
                success: true,
                message: 'Terms accepted successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Mark escrow as delivered
    async markAsDelivered(escrowId, proofFiles = []) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to mark as delivered' };
        }

        try {
            // Upload proof files if provided
            const uploadedFiles = [];
            for (let i = 0; i < proofFiles.length; i++) {
                const file = proofFiles[i];
                const fileName = `${escrowId}/proof_${Date.now()}_${file.name}`;
                
                const { data: uploadData, error: uploadError } = await supabaseHelpers.uploadFile(
                    BUCKETS.PROOF_FILES,
                    fileName,
                    file
                );

                if (uploadError) throw uploadError;
                uploadedFiles.push(uploadData.path);
            }

            // Update escrow
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update({
                    status: 'delivered',
                    proof_file_ids: uploadedFiles,
                    updated_at: new Date().toISOString()
                })
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Create notification for buyer
            await this.createNotification(data.buyer_id, 'escrow_delivered',
                'Escrow Marked as Delivered',
                `Your escrow has been marked as delivered. Please confirm delivery.`,
                escrowId,
                'escrow'
            );

            return {
                success: true,
                message: 'Escrow marked as delivered successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Accept delivery
    async acceptDelivery(escrowId) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to accept delivery' };
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update({
                    status: 'accepted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Create notification for seller
            await this.createNotification(data.seller_id, 'escrow_accepted',
                'Delivery Accepted',
                'The buyer has accepted the delivery. Funds will be released.',
                escrowId,
                'escrow'
            );

            // Auto-release funds after acceptance
            await this.releaseFunds(escrowId);

            return {
                success: true,
                message: 'Delivery accepted successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Release funds
    async releaseFunds(escrowId) {
        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update({
                    status: 'released',
                    updated_at: new Date().toISOString()
                })
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Create transaction record
            await this.createTransaction(escrowId, data.seller_id, 'release', data.amount - data.platform_fee);

            // Create notifications
            await this.createNotification(data.buyer_id, 'funds_released',
                'Funds Released',
                `Funds have been released to the seller.`,
                escrowId,
                'escrow'
            );

            await this.createNotification(data.seller_id, 'funds_received',
                'Funds Received',
                `You have received funds from the escrow.`,
                escrowId,
                'escrow'
            );

            return {
                success: true,
                message: 'Funds released successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Cancel escrow
    async cancelEscrow(escrowId, reason = null) {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to cancel escrow' };
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .update({
                    status: 'cancelled',
                    notes: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', escrowId)
                .select()
                .single();

            if (error) throw error;

            // Create notifications
            await this.notifyEscrowUpdate(data, 'cancelled');

            return {
                success: true,
                message: 'Escrow cancelled successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Create transaction record
    async createTransaction(escrowId, userId, type, amount, paymentDetails = {}) {
        try {
            const { data, error } = await supabase
                .from(TABLES.TRANSACTIONS)
                .insert({
                    escrow_id: escrowId,
                    user_id: userId,
                    type,
                    amount,
                    currency: 'KES',
                    status: 'completed',
                    payment_method: 'internal',
                    payment_details: paymentDetails,
                    transaction_date: new Date().toISOString(),
                    processed_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    // Create notification
    async createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
        try {
            const { data, error } = await supabase
                .from(TABLES.NOTIFICATIONS)
                .insert({
                    user_id: userId,
                    type,
                    title,
                    message,
                    related_id: relatedId,
                    related_type: relatedType,
                    is_read: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    // Notify escrow update
    async notifyEscrowUpdate(escrow, status) {
        const statusMessages = {
            'cancelled': 'Escrow has been cancelled',
            'funded': 'Escrow has been funded',
            'released': 'Funds have been released',
            'disputed': 'Escrow has been disputed'
        };

        const message = statusMessages[status] || `Escrow status updated to: ${status}`;

        if (escrow.buyer_id) {
            await this.createNotification(escrow.buyer_id, 'escrow_updated',
                'Escrow Status Updated', message, escrow.id, 'escrow');
        }

        if (escrow.seller_id) {
            await this.createNotification(escrow.seller_id, 'escrow_updated',
                'Escrow Status Updated', message, escrow.id, 'escrow');
        }
    }

    // Get escrow statistics
    async getEscrowStats() {
        if (!this.currentUser) {
            return { success: false, message: 'Please login to view statistics' };
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.ESCROWS)
                .select('status, amount')
                .or(`buyer_id.eq.${this.currentUser.id},seller_id.eq.${this.currentUser.id}`);

            if (error) throw error;

            const stats = {
                total: data.length,
                pending: data.filter(e => e.status === 'pending').length,
                in_progress: data.filter(e => e.status === 'in_progress').length,
                completed: data.filter(e => e.status === 'released').length,
                cancelled: data.filter(e => e.status === 'cancelled').length,
                total_value: data.reduce((sum, e) => sum + e.amount, 0)
            };

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Add escrow listener
    addEscrowListener(callback) {
        this.escrowListeners.push(callback);
    }

    // Remove escrow listener
    removeEscrowListener(callback) {
        const index = this.escrowListeners.indexOf(callback);
        if (index > -1) {
            this.escrowListeners.splice(index, 1);
        }
    }

    // Notify listeners
    notifyListeners(event, data) {
        this.escrowListeners.forEach(callback => {
            callback(event, data);
        });
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Create and export escrow system instance
const escrowSystem = new EscrowSystem();
export default escrowSystem;
