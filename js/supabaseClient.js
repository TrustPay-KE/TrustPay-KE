/**
 * TrustPay KE - Supabase Client Configuration
 * Supabase v2 Implementation
 */

const SUPABASE_URL = 'https://gifgxyxuzugbkqfpnxxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZmd4eXh1enVnYmtxZnBueHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTMxNjQsImV4cCI6MjA4NzY4OTE2NH0.gfvLygnEPujUtD-_9m4bxousjOVM9q4-mLeqDMotJ3s';

// Create Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'trustpay-supabase-session'
    }
});

console.log('TrustPay Supabase client initialized');
