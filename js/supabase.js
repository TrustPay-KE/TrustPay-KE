/**
 * TrustPay KE - Supabase Configuration
 */

const SUPABASE_URL = 'https://gifgxyxuzugbkqfpnxxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZmd4eXh1enVnYmtxZnBueHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTMxNjQsImV4cCI6MjA4NzY4OTE2NH0.gfvLygnEPujUtD-_9m4bxousjOVM9q4-mLeqDMotJ3s';

// Initialize supabase client
(function init() {
    function waitForSupabase() {
        if (typeof window.supabase !== 'undefined') {
            window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });
            console.log('TrustPay Supabase connected');
        } else {
            setTimeout(waitForSupabase, 50);
        }
    }
    waitForSupabase();
})();
