// Supabase Configuration for TrustPay KE
// Use environment variables in production
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://gifgxyxuzugbkqfpnxxb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZmd4eXh1enVnYmtxZnBueHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTMxNjQsImV4cCI6MjA4NzY4OTE2NH0.gfvLygnEPujUtD-_9m4bxousjOVM9q4-mLeqDMotJ3s';

// Initialize Supabase client
const { createClient } = window.supabase;
if (!createClient) {
    throw new Error('Supabase client not loaded. Please ensure Supabase CDN is included.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export Supabase client
export { supabase };

// Database table names
export const TABLES = {
    USERS: 'users',
    ESCROWS: 'escrows',
    TRANSACTIONS: 'transactions',
    DISPUTES: 'disputes',
    KYC: 'kyc',
    NOTIFICATIONS: 'notifications',
    INVITES: 'invites'
};

// Storage bucket names
export const BUCKETS = {
    KYC_DOCUMENTS: 'kyc_documents',
    PROOF_FILES: 'proof_files',
    PROFILE_IMAGES: 'profile_images'
};

// Helper functions
export const supabaseHelpers = {
    // Test connection
    async testConnection() {
        try {
            const { data, error } = await supabase.from(TABLES.USERS).select('count').limit(1);
            if (error) throw error;
            return { success: true, message: 'Supabase connection successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            return { user, error };
        } catch (error) {
            return { user: null, error };
        }
    },

    // Sign up user
    async signUp(email, password, userData) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Sign out user
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            return { error };
        } catch (error) {
            return { error };
        }
    },

    // Upload file
    async uploadFile(bucket, path, file) {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file);
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get file URL
    getFileUrl(bucket, path) {
        return supabase.storage
            .from(bucket)
            .getPublicUrl(path).data.publicUrl;
    },

    // Delete file
    async deleteFile(bucket, path) {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);
            return { error };
        } catch (error) {
            return { error };
        }
    }
};

export default supabase;
