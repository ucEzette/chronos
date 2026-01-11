-- =============================================
-- ONEROAD Reviews, Favorites, Profiles Tables
-- Run this in your Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    twitter TEXT,
    discord TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet_address);

-- =============================================
-- 2. FAVORITES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    item_id TEXT NOT NULL,
    chain_id INTEGER DEFAULT 0,
    name TEXT,
    preview_url TEXT,
    price TEXT,
    seller TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wallet_address, item_id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_wallet ON favorites(wallet_address);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id);

-- =============================================
-- 3. REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id TEXT NOT NULL,
    chain_id INTEGER DEFAULT 0,
    wallet_address TEXT NOT NULL,
    seller_address TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(wallet_address, item_id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_wallet ON reviews(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_address);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies (Allow all for testing)
-- In production, implement stricter policies
-- =============================================

-- Profiles: Anyone can read, owner can write
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Favorites: Anyone can read, owner can write
CREATE POLICY "Favorites are viewable by everyone" ON favorites FOR SELECT USING (true);
CREATE POLICY "Users can manage their own favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- Reviews: Anyone can read, owner can write
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Auto-update timestamps trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Grant Permissions
-- =============================================
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON favorites TO anon;
GRANT ALL ON favorites TO authenticated;
GRANT ALL ON reviews TO anon;
GRANT ALL ON reviews TO authenticated;
