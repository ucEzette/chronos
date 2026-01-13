-- =============================================
-- 006 FIX REVIEWS SCHEMA
-- Run this in your Supabase SQL Editor to fix the "column seller_address does not exist" error
-- =============================================

-- Add seller_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'seller_address') THEN
        ALTER TABLE reviews ADD COLUMN seller_address TEXT;
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_address);

-- Confirm it works
SELECT * FROM reviews LIMIT 1;
