-- DIAGNOSTIC QUERIES FOR RLS ISSUES
-- Run these to understand the data structure and fix the policies

-- ============================================
-- 1. CHECK TABLE STRUCTURES
-- ============================================

-- Check profiles table structure
SELECT 
  'PROFILES TABLE STRUCTURE' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check transactions table structure
SELECT 
  'TRANSACTIONS TABLE STRUCTURE' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- ============================================
-- 2. CHECK EXISTING DATA (AS ADMIN)
-- ============================================

-- See sample profile data (without RLS)
SELECT 
  'SAMPLE PROFILES (first 3)' as info,
  id,
  email,
  role,
  created_at
FROM profiles
LIMIT 3;

-- See sample transaction data (without RLS)
SELECT 
  'SAMPLE TRANSACTIONS (first 3)' as info,
  id,
  user_id,
  type,
  amount,
  created_at
FROM transactions
LIMIT 3;

-- Check if user_id in transactions matches id in profiles
SELECT 
  'ID MATCHING CHECK' as check_type,
  CASE 
    WHEN COUNT(DISTINCT t.user_id) > 0 THEN 'Transactions exist'
    ELSE 'No transactions'
  END as status,
  COUNT(DISTINCT t.user_id) as unique_users_in_transactions,
  COUNT(DISTINCT p.id) as unique_profiles,
  COUNT(DISTINCT t.user_id) FILTER (WHERE p.id IS NOT NULL) as matching_ids,
  COUNT(DISTINCT t.user_id) FILTER (WHERE p.id IS NULL) as orphaned_transactions
FROM transactions t
LEFT JOIN profiles p ON t.user_id = p.id;

-- ============================================
-- 3. CHECK CURRENT POLICIES
-- ============================================

SELECT 
  'CURRENT RLS POLICIES' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'transactions', 'plans', 'locations', 'credential_pools', 'admin_notifications')
ORDER BY tablename, policyname;

-- ============================================
-- 4. CREATE SUPER PERMISSIVE TEMPORARY POLICY
-- ============================================

-- This will temporarily allow ALL authenticated users to see ALL data
-- Use this ONLY for testing, then remove it!

-- For profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'TEMP_DEBUG_Allow all authenticated users'
  ) THEN
    CREATE POLICY "TEMP_DEBUG_Allow all authenticated users" 
    ON profiles FOR SELECT 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- For transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'TEMP_DEBUG_Allow all authenticated users'
  ) THEN
    CREATE POLICY "TEMP_DEBUG_Allow all authenticated users" 
    ON transactions FOR SELECT 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================
-- 5. TEST IN YOUR APP AFTER RUNNING THIS
-- ============================================

SELECT 'IMPORTANT NEXT STEPS' as action, 'value' as details
UNION ALL
SELECT '1. Run this SQL in Supabase', 'Check the results of ID matching'
UNION ALL
SELECT '2. Refresh your app', 'Data should now appear'
UNION ALL
SELECT '3. Open browser console', 'Run: window.supabaseDebug.testDataAccess()'
UNION ALL
SELECT '4. Remove TEMP policies later', 'After we fix the real issue';

-- ============================================
-- 6. COMMANDS TO REMOVE TEMP POLICIES (RUN LATER)
-- ============================================
-- DROP POLICY IF EXISTS "TEMP_DEBUG_Allow all authenticated users" ON profiles;
-- DROP POLICY IF EXISTS "TEMP_DEBUG_Allow all authenticated users" ON transactions;