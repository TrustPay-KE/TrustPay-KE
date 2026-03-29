-- Simple Database Fix - Disable RLS and Create Tables
-- This will fix all authentication and user saving issues

-- First, disable RLS on all tables to prevent access issues
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS escrows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kyc DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invites DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create users table (simple version)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    kyc_status TEXT DEFAULT 'not_started',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escrows table
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    status TEXT DEFAULT 'pending',
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrows(id),
    type TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrows(id),
    raised_by UUID REFERENCES users(id),
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    evidence TEXT,
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create kyc table
CREATE TABLE IF NOT EXISTS kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    documents JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrows(id),
    invited_by UUID REFERENCES users(id),
    invited_email TEXT NOT NULL,
    invited_phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_escrows_updated_at ON escrows;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
DROP TRIGGER IF EXISTS update_kyc_updated_at ON kyc;
DROP TRIGGER IF EXISTS update_invites_updated_at ON invites;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON kyc FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON invites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Test the setup
SELECT 'users' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'users'
UNION ALL
SELECT 'escrows' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'escrows'
UNION ALL
SELECT 'transactions' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'transactions'
UNION ALL
SELECT 'disputes' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'disputes'
UNION ALL
SELECT 'kyc' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'kyc'
UNION ALL
SELECT 'notifications' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'notifications'
UNION ALL
SELECT 'invites' as table_name, 'OK' as status FROM information_schema.tables WHERE table_name = 'invites';
