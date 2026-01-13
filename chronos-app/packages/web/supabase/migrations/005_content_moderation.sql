-- =============================================
-- ONEROAD Content Moderation Tables
-- Run this in your Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. CONTENT REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Item being reported
    item_id TEXT NOT NULL,
    chain_id INTEGER DEFAULT 0,
    item_name TEXT,
    seller_address TEXT,
    
    -- Reporter info
    reporter_address TEXT NOT NULL,
    
    -- Report details
    reason TEXT NOT NULL CHECK (reason IN ('scam', 'nsfw', 'illegal', 'copyright', 'spam', 'other')),
    description TEXT,
    evidence_urls TEXT[], -- Array of screenshot/evidence URLs
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'actioned')),
    
    -- Admin actions
    reviewed_by TEXT, -- Admin wallet or identifier
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT CHECK (action_taken IN ('none', 'hidden', 'removed', 'banned')),
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Helper Function for timestamps
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reports_item ON content_reports(item_id, chain_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reason ON content_reports(reason);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON content_reports(reporter_address);
CREATE INDEX IF NOT EXISTS idx_reports_seller ON content_reports(seller_address);
CREATE INDEX IF NOT EXISTS idx_reports_created ON content_reports(created_at DESC);

-- =============================================
-- 2. HIDDEN/REMOVED CONTENT TABLE
-- Tracks items that have been moderated
-- =============================================
CREATE TABLE IF NOT EXISTS moderated_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    item_id TEXT NOT NULL,
    chain_id INTEGER DEFAULT 0,
    
    -- Moderation details
    action TEXT NOT NULL CHECK (action IN ('hidden', 'removed')),
    reason TEXT NOT NULL,
    report_id UUID REFERENCES content_reports(id),
    
    -- Who took action
    moderated_by TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(item_id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_moderated_item ON moderated_content(item_id, chain_id);

-- =============================================
-- 3. BANNED USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    wallet_address TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    report_id UUID REFERENCES content_reports(id),
    
    -- Who banned them
    banned_by TEXT NOT NULL,
    
    -- Ban details
    permanent BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_wallet ON banned_users(wallet_address);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Reports: Anyone can create, only admins can view all
CREATE POLICY "Anyone can create reports" ON content_reports 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own reports" ON content_reports 
    FOR SELECT USING (true); -- Adjust for production

CREATE POLICY "Admins can update reports" ON content_reports 
    FOR UPDATE USING (true) WITH CHECK (true); -- Adjust for production

-- Moderated content: Anyone can read (to check if content is hidden)
CREATE POLICY "Anyone can view moderated content" ON moderated_content 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage moderated content" ON moderated_content 
    FOR ALL USING (true) WITH CHECK (true);

-- Banned users: Anyone can read (to check if user is banned)
CREATE POLICY "Anyone can view banned users" ON banned_users 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage banned users" ON banned_users 
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Auto-update timestamps trigger
-- =============================================
DROP TRIGGER IF EXISTS update_reports_updated_at ON content_reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Grant Permissions
-- =============================================
GRANT ALL ON content_reports TO anon;
GRANT ALL ON content_reports TO authenticated;
GRANT ALL ON moderated_content TO anon;
GRANT ALL ON moderated_content TO authenticated;
GRANT ALL ON banned_users TO anon;
GRANT ALL ON banned_users TO authenticated;
