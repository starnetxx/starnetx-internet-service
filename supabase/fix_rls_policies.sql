-- ============================================
-- FIX RLS POLICIES FOR ADMIN DATA ACCESS
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This will ensure admins can see ALL data

-- First, let's check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('credential_pools', 'transactions', 'admin_notifications', 'plans', 'locations', 'profiles');

-- ============================================
-- 1. CREDENTIAL_POOLS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to credential_pools" ON credential_pools;
DROP POLICY IF EXISTS "Service role full access" ON credential_pools;
DROP POLICY IF EXISTS "Admins can manage credential pools" ON credential_pools;
DROP POLICY IF EXISTS "Users can view their assigned credentials" ON credential_pools;

-- Create new comprehensive admin policy
CREATE POLICY "Admin full access to credential_pools"
ON credential_pools
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
);

-- Allow users to see their assigned credentials
CREATE POLICY "Users view assigned credentials"
ON credential_pools
FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================
-- 2. TRANSACTIONS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role full access transactions" ON transactions;

-- Create new comprehensive admin policy
CREATE POLICY "Admin full access to transactions"
ON transactions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
);

-- Users can only see their own transactions
CREATE POLICY "Users view own transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================
-- 3. ADMIN_NOTIFICATIONS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Public read active notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins manage notifications" ON admin_notifications;

-- Admin full access
CREATE POLICY "Admin full access notifications"
ON admin_notifications
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR 
    auth.jwt()->>'role' = 'service_role'
);

-- Users can read active notifications
CREATE POLICY "Users read active notifications"
ON admin_notifications
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================
-- 4. PROFILES TABLE (ensure admin can see all users)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin manage all profiles" ON profiles;

-- Admin can view all profiles
CREATE POLICY "Admin view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR 
    id = auth.uid()
);

-- Admin can update all profiles
CREATE POLICY "Admin manage profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR 
    id = auth.uid()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR 
    id = auth.uid()
);

-- ============================================
-- 5. ENABLE RLS ON ALL TABLES (if not already enabled)
-- ============================================

ALTER TABLE credential_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. PLANS AND LOCATIONS (public read, admin write)
-- ============================================

-- Plans policies
DROP POLICY IF EXISTS "Public read plans" ON plans;
DROP POLICY IF EXISTS "Admin manage plans" ON plans;

CREATE POLICY "Public read plans"
ON plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manage plans"
ON plans
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Locations policies
DROP POLICY IF EXISTS "Public read locations" ON locations;
DROP POLICY IF EXISTS "Admin manage locations" ON locations;

CREATE POLICY "Public read locations"
ON locations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manage locations"
ON locations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================
-- 7. VERIFY ADMIN USER ROLE
-- ============================================

-- Check if your admin user has the correct role
-- Replace 'your-admin-email@example.com' with your actual admin email
SELECT id, email, role, created_at 
FROM profiles 
WHERE email = 'your-admin-email@example.com';

-- If the role is not 'admin', update it:
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'your-admin-email@example.com';

-- ============================================
-- 8. TEST QUERIES
-- ============================================

-- After running the above, test with these queries:
-- These should return data when logged in as admin

-- Test 1: Count all credentials
SELECT COUNT(*) as total_credentials FROM credential_pools;

-- Test 2: Count all transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Test 3: Count all notifications
SELECT COUNT(*) as total_notifications FROM admin_notifications;

-- Test 4: Check admin role
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- ============================================
-- 9. ALTERNATIVE: TEMPORARY DISABLE RLS (NOT RECOMMENDED FOR PRODUCTION)
-- ============================================
-- If you need to temporarily disable RLS for debugging:
-- ALTER TABLE credential_pools DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_notifications DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable after debugging!