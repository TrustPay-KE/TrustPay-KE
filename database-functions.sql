-- TrustPay Database Creation Functions
-- Run these in Supabase SQL Editor to create the necessary tables

-- Create users table function
CREATE OR REPLACE FUNCTION create_users_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    
    -- Enable RLS
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Admins can view all users" ON users;
    DROP POLICY IF EXISTS "Admins can update all users" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    
    -- Create simple policies
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create escrows table function
CREATE OR REPLACE FUNCTION create_escrows_table()
RETURNS void AS $$
BEGIN
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
    
    ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view escrows they participate in" ON escrows;
    DROP POLICY IF EXISTS "Users can create escrows" ON escrows;
    DROP POLICY IF EXISTS "Users can update escrows they participate in" ON escrows;
    DROP POLICY IF EXISTS "Admins can view all escrows" ON escrows;
    
    CREATE POLICY "Users can view escrows they participate in" ON escrows FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    CREATE POLICY "Users can create escrows" ON escrows FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
    CREATE POLICY "Users can update escrows they participate in" ON escrows FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    CREATE POLICY "Admins can view all escrows" ON escrows FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create transactions table function
CREATE OR REPLACE FUNCTION create_transactions_table()
RETURNS void AS $$
BEGIN
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
    
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
    DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
    
    CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
        EXISTS (SELECT 1 FROM escrows WHERE escrows.id = transactions.escrow_id 
        AND (escrows.buyer_id = auth.uid() OR escrows.seller_id = auth.uid()))
    );
    CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create disputes table function
CREATE OR REPLACE FUNCTION create_disputes_table()
RETURNS void AS $$
BEGIN
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
    
    ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view disputes they are involved in" ON disputes;
    DROP POLICY IF EXISTS "Users can create disputes" ON disputes;
    DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
    
    CREATE POLICY "Users can view disputes they are involved in" ON disputes FOR SELECT USING (
        EXISTS (SELECT 1 FROM escrows WHERE escrows.id = disputes.escrow_id 
        AND (escrows.buyer_id = auth.uid() OR escrows.seller_id = auth.uid()))
    );
    CREATE POLICY "Users can create disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
    CREATE POLICY "Admins can view all disputes" ON disputes FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create KYC table function
CREATE OR REPLACE FUNCTION create_kyc_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS kyc (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        documents JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE kyc ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own KYC" ON kyc;
    DROP POLICY IF EXISTS "Users can create own KYC" ON kyc;
    DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc;
    
    CREATE POLICY "Users can view own KYC" ON kyc FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can create own KYC" ON kyc FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Admins can view all KYC" ON kyc FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create notifications table function
CREATE OR REPLACE FUNCTION create_notifications_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    
    CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Admins can manage all notifications" ON notifications FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create invites table function
CREATE OR REPLACE FUNCTION create_invites_table()
RETURNS void AS $$
BEGIN
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
    
    ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view invites they created or received" ON invites;
    DROP POLICY IF EXISTS "Users can create invites" ON invites;
    
    CREATE POLICY "Users can view invites they created or received" ON invites FOR SELECT USING (
        auth.uid() = invited_by OR invited_email = (SELECT email FROM users WHERE id = auth.uid()))
    );
    CREATE POLICY "Users can create invites" ON invites FOR INSERT WITH CHECK (auth.uid() = invited_by);
    CREATE POLICY "Admins can view all invites" ON invites FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON kyc FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON invites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
