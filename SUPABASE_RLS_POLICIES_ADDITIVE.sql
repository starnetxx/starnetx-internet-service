-- ADDITIVE RLS POLICY FIX FOR STARNETX
-- This only ADDS or UPDATES policies without removing existing ones
-- Safe to run multiple times - uses CREATE OR REPLACE

-- ============================================
-- ENSURE RLS IS ENABLED (Safe - won't affect existing policies)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADD PERMISSIVE POLICIES FOR USER ACCESS
-- These use IF NOT EXISTS to avoid conflicts
-- ============================================

-- PROFILES: Add permissive policy for users to see their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can access own profile by id or email'
  ) THEN
    CREATE POLICY "Users can access own profile by id or email" 
    ON profiles FOR ALL 
    USING (
      auth.uid() = id 
      OR 
      email = auth.jwt()->>'email'
    )
    WITH CHECK (
      auth.uid() = id 
      OR 
      email = auth.jwt()->>'email'
    );
  END IF;
END $$;

-- TRANSACTIONS: Add permissive policy for users to access their transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Users can access own transactions by id or email'
  ) THEN
    CREATE POLICY "Users can access own transactions by id or email" 
    ON transactions FOR ALL 
    USING (
      auth.uid() = user_id 
      OR 
      user_id IN (SELECT id FROM profiles WHERE email = auth.jwt()->>'email')
    )
    WITH CHECK (
      auth.uid() = user_id 
      OR 
      user_id IN (SELECT id FROM profiles WHERE email = auth.jwt()->>'email')
    );
  END IF;
END $$;

-- CREDENTIAL_POOLS: Add permissive policy for credential access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credential_pools' 
    AND policyname = 'Users can access assigned credentials by id or email'
  ) THEN
    CREATE POLICY "Users can access assigned credentials by id or email" 
    ON credential_pools FOR SELECT 
    USING (
      assigned_to = auth.uid() 
      OR 
      assigned_to IN (SELECT id FROM profiles WHERE email = auth.jwt()->>'email')
    );
  END IF;
END $$;

-- ============================================
-- ADD PUBLIC ACCESS POLICIES (if not exist)
-- ============================================

-- PLANS: Ensure public can view active plans
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'plans' 
    AND policyname = 'Public can view active plans'
  ) THEN
    CREATE POLICY "Public can view active plans" 
    ON plans FOR SELECT 
    USING (is_active = true);
  END IF;
END $$;

-- LOCATIONS: Ensure public can view active locations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' 
    AND policyname = 'Public can view active locations'
  ) THEN
    CREATE POLICY "Public can view active locations" 
    ON locations FOR SELECT 
    USING (is_active = true);
  END IF;
END $$;

-- ADMIN_NOTIFICATIONS: Ensure public can view active notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_notifications' 
    AND policyname = 'Public can view active notifications'
  ) THEN
    CREATE POLICY "Public can view active notifications" 
    ON admin_notifications FOR SELECT 
    USING (is_active = true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check what policies exist now
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'transactions', 'plans', 'locations', 'credential_pools', 'admin_notifications')
ORDER BY tablename, policyname;

-- Test your access
SELECT 'Testing Your Access' as test_type, '' as result
UNION ALL
SELECT 'Your Auth ID:', auth.uid()::text
UNION ALL
SELECT 'Your Email:', COALESCE(auth.jwt()->>'email', 'Not available')
UNION ALL
SELECT 'Profile Access:', 
  CASE WHEN EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth.uid() = id OR email = auth.jwt()->>'email'
  ) THEN 'YES ✓' ELSE 'NO ✗' END
UNION ALL
SELECT 'Transaction Count:', 
  COALESCE(
    (SELECT COUNT(*)::text FROM transactions 
     WHERE user_id = auth.uid() 
        OR user_id IN (SELECT id FROM profiles WHERE email = auth.jwt()->>'email')
    ), '0'
  )
UNION ALL
SELECT 'Plans Available:', 
  COALESCE((SELECT COUNT(*)::text FROM plans WHERE is_active = true), '0')
UNION ALL
SELECT 'Locations Available:', 
  COALESCE((SELECT COUNT(*)::text FROM locations WHERE is_active = true), '0');