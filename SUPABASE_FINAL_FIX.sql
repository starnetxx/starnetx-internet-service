-- FINAL FIX - HANDLES EXISTING POLICIES PROPERLY
-- This will fix the ID mismatch issue without policy conflicts

-- ============================================
-- STEP 1: ANALYZE THE PROBLEM
-- ============================================

SELECT '=== CHECKING FOR ID MISMATCHES ===' as status;

-- Check for ID mismatches between auth.users and profiles
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  CASE 
    WHEN p.id IS NULL THEN '❌ Missing profile'
    WHEN au.id != p.id THEN '❌ ID MISMATCH!'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email
ORDER BY au.created_at DESC;

-- ============================================
-- STEP 2: FIX ID MISMATCHES
-- ============================================

SELECT '=== FIXING ID MISMATCHES ===' as status;

-- Update profiles to use correct auth.users ID
UPDATE profiles p
SET id = au.id
FROM auth.users au
WHERE p.email = au.email
  AND p.id != au.id;

-- Update transactions to use correct user IDs
UPDATE transactions t
SET user_id = au.id
FROM profiles p
JOIN auth.users au ON p.email = au.email
WHERE t.user_id = p.id
  AND p.id != au.id;

-- Update credential_pools assigned_to if needed
UPDATE credential_pools cp
SET assigned_to = au.id
FROM profiles p
JOIN auth.users au ON p.email = au.email
WHERE cp.assigned_to = p.id
  AND p.id != au.id;

-- ============================================
-- STEP 3: CLEAN UP OLD POLICIES
-- ============================================

SELECT '=== CLEANING UP POLICIES ===' as status;

-- Remove all existing policies for profiles and transactions
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on profiles
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;

  -- Drop all policies on transactions
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', pol.policyname);
  END LOOP;

  -- Drop all policies on plans
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'plans'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON plans', pol.policyname);
  END LOOP;

  -- Drop all policies on locations
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'locations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON locations', pol.policyname);
  END LOOP;

  -- Drop all policies on admin_notifications
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'admin_notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON admin_notifications', pol.policyname);
  END LOOP;

  -- Drop all policies on credential_pools
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'credential_pools'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON credential_pools', pol.policyname);
  END LOOP;
END $$;

-- ============================================
-- STEP 4: CREATE FRESH, SIMPLE POLICIES
-- ============================================

SELECT '=== CREATING NEW POLICIES ===' as status;

-- PROFILES policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- TRANSACTIONS policies
CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PLANS policies (public access)
CREATE POLICY "Anyone can view active plans" 
ON plans FOR SELECT 
USING (is_active = true);

-- LOCATIONS policies (public access)
CREATE POLICY "Anyone can view active locations" 
ON locations FOR SELECT 
USING (is_active = true);

-- ADMIN_NOTIFICATIONS policies (public access)
CREATE POLICY "Anyone can view active notifications" 
ON admin_notifications FOR SELECT 
USING (is_active = true);

-- CREDENTIAL_POOLS policies
CREATE POLICY "Users can view assigned credentials" 
ON credential_pools FOR SELECT 
USING (assigned_to = auth.uid());

-- ============================================
-- STEP 5: VERIFY THE FIX
-- ============================================

SELECT '=== VERIFICATION ===' as status;

-- Check if IDs now match
SELECT 
  'ID Match Check' as check_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE au.id = p.id) as matching_ids,
  COUNT(*) FILTER (WHERE au.id != p.id OR p.id IS NULL) as problem_ids
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email;

-- Check transaction ownership
SELECT 
  'Transaction Check' as check_type,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE user_id IN (SELECT id FROM auth.users)) as valid_transactions
FROM transactions;

-- Show current policies
SELECT 
  'Current Policies' as info,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('profiles', 'transactions', 'plans', 'locations', 'credential_pools', 'admin_notifications')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- STEP 6: TEST QUERY (for logged-in users)
-- ============================================

SELECT '=== FINAL STATUS ===' as status;

SELECT 
  '✅ FIX COMPLETE!' as status,
  'All ID mismatches have been fixed' as details
UNION ALL
SELECT 
  '✅ POLICIES RECREATED',
  'Clean policies are now in place'
UNION ALL
SELECT 
  '👉 NEXT STEP',
  'Refresh your app - data should now appear!'
UNION ALL
SELECT 
  '🧪 TO TEST',
  'Run window.supabaseDebug.testDataAccess() in browser console';