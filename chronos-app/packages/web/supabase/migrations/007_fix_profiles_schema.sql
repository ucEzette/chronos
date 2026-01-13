-- =============================================
-- 007 FIX PROFILES SCHEMA
-- Run this to ensure all profile columns exist
-- =============================================

DO $$
BEGIN
    -- Ensure display_name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Ensure avatar_url exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- Ensure bio exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;

    -- Ensure twitter exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter') THEN
        ALTER TABLE profiles ADD COLUMN twitter TEXT;
    END IF;

    -- Ensure discord exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'discord') THEN
        ALTER TABLE profiles ADD COLUMN discord TEXT;
    END IF;

    -- Ensure website exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE profiles ADD COLUMN website TEXT;
    END IF;
END $$;

-- Verify
SELECT * FROM profiles LIMIT 1;
