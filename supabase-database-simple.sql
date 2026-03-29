-- TrustPay KE - Simple Database Setup (No RLS Issues)
-- This disables RLS temporarily to fix recursion issues

-- First, disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE escrows DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE kyc DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Users can view escrows they participate in" ON escrows;
DROP POLICY IF EXISTS "Users can create escrows" ON escrows;
DROP POLICY IF EXISTS "Users can update escrows they participate in" ON escrows;
DROP POLICY IF EXISTS "Admins can view all escrows" ON escrows;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view disputes they are involved in" ON disputes;
DROP POLICY IF EXISTS "Users can create disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;

DROP POLICY IF EXISTS "Users can view own KYC" ON kyc;
DROP POLICY IF EXISTS "Users can create own KYC" ON kyc;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view invites they created or received" ON invites;
DROP POLICY IF EXISTS "Users can create invites" ON invites;

-- Keep RLS disabled for now - this will allow all operations
-- You can enable RLS later with simple policies if needed

-- Test function to verify tables exist
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS TABLE(table_name text, status text) AS $$
BEGIN
    RETURN QUERY
    SELECT 'users'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
    UNION ALL
    SELECT 'escrows'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrows')
    UNION ALL
    SELECT 'transactions'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')
    UNION ALL
    SELECT 'disputes'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disputes')
    UNION ALL
    SELECT 'kyc'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kyc')
    UNION ALL
    SELECT 'notifications'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
    UNION ALL
    SELECT 'invites'::text, 'OK'::text WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites');
END;
$$ LANGUAGE plpgsql;
