-- COMPLETE FIX USING SERVICE ROLE (BYPASSES RLS)
-- Run this in Supabase SQL Editor to fix the ID mismatch issue

-- ============================================
-- STEP 1: ANALYZE THE PROBLEM
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
    WHEN au.id != p.id THEN 'ID MISMATCH!'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email
ORDER BY au.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 2: FIX ID MISMATCHES
-- ============================================

-- Update profiles to use correct auth.users ID
UPDATE profiles p
SET id = au.id
FROM auth.users au
WHERE p.email = au.email
  AND p.id != au.id;

-- Update transactions to use correct user IDs
UPDATE transactions t
SET user_id = p.id
FROM profiles p
WHERE t.user_id IN (
  SELECT old_p.id 
  FROM profiles old_p 
  WHERE old_p.email = p.email
)
AND t.user_id != p.id;

-- Update credential_pools assigned_to if needed
UPDATE credential_pools cp
SET assigned_to = p.id
FROM profiles p
WHERE cp.assigned_to IN (
  SELECT old_p.id 
  FROM profiles old_p 
  WHERE old_p.email = p.email
)
AND cp.assigned_to != p.id;

-- ============================================
-- STEP 3: CREATE SIMPLE, CORRECT POLICIES
-- ============================================

-- Drop all existing policies for a clean start
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can access own profile by id or email" ON profiles;
DROP POLICY IF EXISTS "TEMP_DEBUG_Allow all authenticated users" ON profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can access own transactions by id or email" ON transactions;
DROP POLICY IF EXISTS "TEMP_DEBUG_Allow all authenticated users" ON transactions;

-- Create clean, simple policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id);

-- Keep public access for plans and locations
CREATE POLICY "Anyone can view active plans" 
ON plans FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active locations" 
ON locations FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active notifications" 
ON admin_notifications FOR SELECT 
USING (is_active = true);

-- ============================================
-- STEP 4: VERIFY THE FIX
-- ============================================

-- Check if IDs now match
SELECT 
  'VERIFICATION: IDs should now match' as check,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE au.id = p.id) as matching_ids,
  COUNT(*) FILTER (WHERE au.id != p.id) as mismatched_ids
FROM auth.users au
JOIN profiles p ON p.email = au.email;

-- Check transaction ownership
SELECT 
  'VERIFICATION: Transaction ownership' as check,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE user_id IN (SELECT id FROM profiles)) as valid_transactions,
  COUNT(*) FILTER (WHERE user_id NOT IN (SELECT id FROM profiles)) as orphaned_transactions
FROM transactions;

-- Final message
SELECT 
  'NEXT STEPS' as action,
  'Now refresh your app - everything should work!' as instruction;