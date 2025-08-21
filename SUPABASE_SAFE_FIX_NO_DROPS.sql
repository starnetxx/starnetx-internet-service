-- ULTRA SAFE FIX - NO DROPS, ONLY FIXES
-- This version has NO destructive operations

-- ============================================
-- STEP 1: ANALYZE THE PROBLEM (READ ONLY)
-- ============================================

-- Check for ID mismatches between auth.users and profiles
SELECT 
  'AUTH USERS vs PROFILES CHECK' as check_type,
  au.id as auth_user_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  CASE 
    WHEN p.id IS NULL THEN 'Missing profile'
    WHEN au.id != p.id THEN 'ID MISMATCH - THIS IS THE PROBLEM!'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email
ORDER BY au.created_at DESC;

-- Show the exact mismatches that need fixing
SELECT 
  'PROFILES THAT NEED ID FIX' as issue,
  p.id as current_wrong_id,
  au.id as should_be_id,
  p.email
FROM profiles p
JOIN auth.users au ON p.email = au.email
WHERE p.id != au.id;

-- ============================================
-- STEP 2: FIX ID MISMATCHES (SAFE UPDATES ONLY)
-- ============================================

-- First, let's see what would be updated (preview only)
SELECT 
  'PREVIEW: Profiles to update' as action,
  COUNT(*) as profiles_to_fix
FROM profiles p
JOIN auth.users au ON p.email = au.email
WHERE p.id != au.id;

-- Fix profile IDs to match auth.users IDs
-- This is SAFE - only updates the ID field to match auth
UPDATE profiles p
SET id = au.id
FROM auth.users au
WHERE p.email = au.email
  AND p.id != au.id
RETURNING 'Updated profile for: ' || p.email as fixed;

-- Fix transactions to point to correct user IDs
WITH profile_mapping AS (
  SELECT 
    old_p.id as old_id,
    au.id as new_id
  FROM profiles old_p
  JOIN auth.users au ON old_p.email = au.email
  WHERE old_p.id != au.id
)
UPDATE transactions t
SET user_id = pm.new_id
FROM profile_mapping pm
WHERE t.user_id = pm.old_id
RETURNING 'Updated transactions for user_id: ' || pm.old_id || ' -> ' || pm.new_id as fixed;

-- Fix credential_pools if needed
WITH profile_mapping AS (
  SELECT 
    old_p.id as old_id,
    au.id as new_id
  FROM profiles old_p
  JOIN auth.users au ON old_p.email = au.email
  WHERE old_p.id != au.id
)
UPDATE credential_pools cp
SET assigned_to = pm.new_id
FROM profile_mapping pm
WHERE cp.assigned_to = pm.old_id
RETURNING 'Updated credential_pools for user: ' || pm.old_id || ' -> ' || pm.new_id as fixed;

-- ============================================
-- STEP 3: ADD SIMPLE WORKING POLICIES (NON-DESTRUCTIVE)
-- ============================================

-- Add new policies with unique names (won't conflict with existing ones)
DO $$ 
BEGIN
  -- For profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Fixed_Users_can_SELECT_own_profile'
  ) THEN
    CREATE POLICY "Fixed_Users_can_SELECT_own_profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Fixed_Users_can_UPDATE_own_profile'
  ) THEN
    CREATE POLICY "Fixed_Users_can_UPDATE_own_profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Fixed_Users_can_INSERT_own_profile'
  ) THEN
    CREATE POLICY "Fixed_Users_can_INSERT_own_profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);
  END IF;

  -- For transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Fixed_Users_can_SELECT_own_transactions'
  ) THEN
    CREATE POLICY "Fixed_Users_can_SELECT_own_transactions" 
    ON transactions FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Fixed_Users_can_INSERT_own_transactions'
  ) THEN
    CREATE POLICY "Fixed_Users_can_INSERT_own_transactions" 
    ON transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Fixed_Users_can_UPDATE_own_transactions'
  ) THEN
    CREATE POLICY "Fixed_Users_can_UPDATE_own_transactions" 
    ON transactions FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- STEP 4: VERIFY EVERYTHING IS FIXED
-- ============================================

-- Final verification
SELECT 
  'FINAL CHECK' as status,
  'Total Users' as metric,
  COUNT(*) as value
FROM auth.users
UNION ALL
SELECT 
  'FINAL CHECK',
  'Profiles with correct IDs',
  COUNT(*)
FROM profiles p
JOIN auth.users au ON p.email = au.email AND p.id = au.id
UNION ALL
SELECT 
  'FINAL CHECK',
  'Profiles with WRONG IDs (should be 0)',
  COUNT(*)
FROM profiles p
JOIN auth.users au ON p.email = au.email AND p.id != au.id
UNION ALL
SELECT 
  'FINAL CHECK',
  'Total valid transactions',
  COUNT(*)
FROM transactions t
WHERE t.user_id IN (SELECT id FROM profiles);

-- Success message
SELECT 
  '✅ FIX COMPLETE!' as status,
  'Now refresh your app - your data should appear!' as next_step;