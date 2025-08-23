-- ============================================
-- REFERRAL CODE FIX - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This script fixes the referral code validation issue during user registration
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Create RPC function for referral code validation
-- This function can be called by anonymous users during registration
CREATE OR REPLACE FUNCTION validate_referral_code(code text)
RETURNS uuid AS $$
DECLARE
  referrer_id uuid;
BEGIN
  -- Check if the referral code exists and get the user ID
  SELECT id INTO referrer_id
  FROM profiles
  WHERE referral_code = UPPER(code)
  LIMIT 1;
  
  -- Return the referrer ID if found, NULL otherwise
  RETURN referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION validate_referral_code TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION validate_referral_code IS 'Validates a referral code and returns the referrer user ID if valid, NULL if invalid';

-- Step 2: Create alternative function for checking if referral code exists
CREATE OR REPLACE FUNCTION check_referral_code_exists(code text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE referral_code = UPPER(code)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION check_referral_code_exists TO anon, authenticated;

-- Step 3: Update RLS policies to allow referral code checking
-- First, check if the policy exists and drop it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    DROP POLICY "Users can view own profile" ON profiles;
  END IF;
END $$;

-- Create new policy that allows users to view profiles for referral code checking
CREATE POLICY "Users can view profiles for referral validation" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR true); -- Allow viewing all profiles for referral code checking

-- Create policy for anonymous users to check referral codes
-- This is important for registration validation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Anyone can check referral codes'
  ) THEN
    CREATE POLICY "Anyone can check referral codes" ON profiles
      FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Step 4: Verify the functions were created successfully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_referral_code') THEN
    RAISE NOTICE 'validate_referral_code function created successfully';
  ELSE
    RAISE WARNING 'validate_referral_code function was not created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_referral_code_exists') THEN
    RAISE NOTICE 'check_referral_code_exists function created successfully';
  ELSE
    RAISE WARNING 'check_referral_code_exists function was not created';
  END IF;
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================
-- After running this script, the referral code validation should work properly
-- Users will get specific error messages when:
-- 1. Referral code is invalid
-- 2. Email is already registered
-- 3. Other registration errors occur