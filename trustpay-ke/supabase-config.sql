-- =====================================================
-- SUPABASE AUTH CONFIGURATION
-- Run this in Supabase Dashboard -> SQL Editor
-- =====================================================

-- 1. Configure Site URL for email redirects
-- Go to: Authentication -> URL Configuration
-- Add your site URL: https://trustpay-ke.netlify.app (or your actual Netlify URL)

-- 2. Enable Email Confirmations
-- Go to: Authentication -> Providers -> Email
-- Enable "Confirm email" = ON

-- 3. Configure SMTP for email sending (Free tier has limited emails)
-- Go to: Authentication -> Email Providers
-- Add your SMTP settings (e.g., SendGrid, Mailgun, or Gmail SMTP)

-- =====================================================
-- AUTHENTICATION SETTINGS SQL
-- =====================================================

-- Update auth config to allow email confirmation
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create a function to check email confirmation status
CREATE OR REPLACE FUNCTION get_user_email_status(user_email TEXT)
RETURNS TABLE(email TEXT, email_confirmed_at TIMESTAMPTZ, created_at TIMESTAMPTZ) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT u.email, u.email_confirmed_at, u.created_at
    FROM auth.users u
    WHERE u.email = user_email;
END;
$$;

-- Grant permission to check email status
GRANT EXECUTE ON FUNCTION get_user_email_status(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_email_status(TEXT) TO authenticated;

SELECT 'Auth configuration complete!' as status;
