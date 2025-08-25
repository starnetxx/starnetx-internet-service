-- ============================================
-- CHECK RLS STATUS AND DIAGNOSE ISSUES
-- ============================================
-- Run this in Supabase SQL Editor to diagnose RLS issues

-- 1. Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('credential_pools', 'transactions', 'admin_notifications', 'plans', 'locations', 'profiles')
ORDER BY tablename;

-- 2. List all policies on important tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('credential_pools', 'transactions', 'admin_notifications')
ORDER BY tablename, policyname;

-- 3. Check current user and their role
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email,
    auth.jwt()->>'role' as jwt_role,
    p.role as profile_role,
    p.email as profile_email
FROM profiles p
WHERE p.id = auth.uid();

-- 4. Count records visible with current RLS policies
SELECT 
    'credential_pools' as table_name,
    COUNT(*) as visible_records
FROM credential_pools
UNION ALL
SELECT 
    'transactions' as table_name,
    COUNT(*) as visible_records
FROM transactions
UNION ALL
SELECT 
    'admin_notifications' as table_name,
    COUNT(*) as visible_records
FROM admin_notifications
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as visible_records
FROM profiles
UNION ALL
SELECT 
    'plans' as table_name,
    COUNT(*) as visible_records
FROM plans
UNION ALL
SELECT 
    'locations' as table_name,
    COUNT(*) as visible_records
FROM locations;

-- 5. Check if there are ANY records in the tables (bypasses RLS)
SELECT 
    'credential_pools' as table_name,
    (SELECT COUNT(*) FROM credential_pools) as total_records
UNION ALL
SELECT 
    'transactions' as table_name,
    (SELECT COUNT(*) FROM transactions) as total_records
UNION ALL
SELECT 
    'admin_notifications' as table_name,
    (SELECT COUNT(*) FROM admin_notifications) as total_records;

-- 6. List all admin users
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 7. Check if current user is admin
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        ) THEN 'YES - User is admin'
        ELSE 'NO - User is NOT admin'
    END as is_admin;