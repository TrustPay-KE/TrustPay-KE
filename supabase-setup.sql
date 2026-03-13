-- =====================================================
-- TRUSTPAY KE DATABASE SETUP
-- Go to Supabase Dashboard -> SQL Editor and run this
-- =====================================================

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager', 'director', 'secretary')),
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    tracking_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Online', 'Offline')),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    role TEXT CHECK (role IN ('buyer', 'seller')),
    user_id UUID REFERENCES users(id),
    user_name TEXT,
    user_email TEXT,
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    seller_name TEXT,
    seller_phone TEXT,
    mpesa_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DROP POLICY IF EXISTS "Public can read users" ON users;
DROP POLICY IF EXISTS "Public can read orders" ON orders;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;

CREATE POLICY "Public can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public can read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can insert orders" ON orders FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Insert demo users (NO admin demo - use signup page)
INSERT INTO users (name, email, phone, role, password)
VALUES 
    ('John Doe', 'client@trustpay.co.ke', '+254797347508', 'user', 'client123'),
    ('Jane Smith', 'manager@trustpay.co.ke', '+254712345678', 'manager', 'password123'),
    ('Mike Johnson', 'director@trustpay.co.ke', '+254723456789', 'director', 'password123'),
    ('Sarah Williams', 'secretary@trustpay.co.ke', '+254734567890', 'secretary', 'password123')
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'Database setup complete! Tables created: users, orders' as status;
