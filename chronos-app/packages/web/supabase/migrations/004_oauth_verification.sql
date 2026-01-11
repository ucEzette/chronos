-- =============================================
-- OAuth Verified Social Accounts
-- Add verification columns to profiles table
-- Run this in Supabase SQL Editor
-- =============================================

-- Add Twitter verification columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN DEFAULT false;

-- Add Discord verification columns  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_verified BOOLEAN DEFAULT false;

-- Add GitHub verification columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_verified BOOLEAN DEFAULT false;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_twitter_id ON profiles(twitter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_github_id ON profiles(github_id);
