/**
 * TrustPay KE - Supabase Configuration
 * Uses Supabase CDN - no build step required
 */

const SUPABASE_URL = 'https://gifgxyxuzugbkqfpnxxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZmd4eXh1enVnYmtxZnBueHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTMxNjQsImV4cCI6MjA4NzY4OTE2NH0.gfvLygnEPujUtD-_9m4bxousjOVM9q4-mLeqDMotJ3s';

// Create Supabase client (global)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Database table names
const TABLES = {
    USERS: 'users',
    TRANSACTIONS: 'transactions'
};

// Test connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from(TABLES.USERS).select('id').limit(1);
        if (error) throw error;
        console.log('Supabase connected successfully');
        return true;
    } catch (error) {
        console.error('Supabase connection failed:', error.message);
        return false;
    }
}

// Export for use in other scripts
window.supabaseClient = supabase;
window.TABLES = TABLES;
window.testConnection = testConnection;
