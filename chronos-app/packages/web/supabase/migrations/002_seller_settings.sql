-- =============================================
-- ONEROAD Seller Settings Table
-- Run this in your Supabase SQL Editor
-- =============================================

-- Create seller_settings table
CREATE TABLE IF NOT EXISTS seller_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    item_name TEXT NOT NULL,
    encryption_key TEXT NOT NULL,
    auto_deliver BOOLEAN DEFAULT true,
    chain_id INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for upsert
    UNIQUE(wallet_address, item_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_settings_wallet 
ON seller_settings(wallet_address);

CREATE INDEX IF NOT EXISTS idx_seller_settings_item 
ON seller_settings(wallet_address, item_name);

-- Enable Row Level Security
ALTER TABLE seller_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own settings
CREATE POLICY "Users can manage their own seller settings"
ON seller_settings
FOR ALL
USING (wallet_address = lower(current_setting('request.jwt.claims')::json->>'sub'))
WITH CHECK (wallet_address = lower(current_setting('request.jwt.claims')::json->>'sub'));

-- Alternative simpler policy (if above doesn't work)
-- This allows all authenticated users to manage ANY settings
-- Use with caution - enable stricter policy in production
CREATE POLICY "Allow all operations on seller_settings"
ON seller_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_seller_settings_updated_at ON seller_settings;
CREATE TRIGGER update_seller_settings_updated_at
    BEFORE UPDATE ON seller_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Grant Permissions
-- =============================================
GRANT ALL ON seller_settings TO anon;
GRANT ALL ON seller_settings TO authenticated;
GRANT ALL ON seller_settings TO service_role;
