-- ============================================
-- QUICK FIX: GRANT ADMIN ACCESS
-- ============================================
-- Run this in Supabase SQL Editor

-- Step 1: First, find your user ID by email
-- Replace with your actual email
SELECT id, email, role 
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Step 2: Update your role to admin
-- Replace the email with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Step 3: Create a simple policy for admin access to ALL data
-- This is a temporary fix - you can refine later

-- For credential_pools
DROP POLICY IF EXISTS "temp_admin_all_access_creds" ON credential_pools;
CREATE POLICY "temp_admin_all_access_creds"
ON credential_pools
FOR ALL
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR auth.jwt()->>'role' = 'service_role'
);

-- For transactions  
DROP POLICY IF EXISTS "temp_admin_all_access_trans" ON transactions;
CREATE POLICY "temp_admin_all_access_trans"
ON transactions
FOR ALL
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR auth.jwt()->>'role' = 'service_role'
);

-- For admin_notifications
DROP POLICY IF EXISTS "temp_admin_all_access_notif" ON admin_notifications;
CREATE POLICY "temp_admin_all_access_notif"
ON admin_notifications
FOR ALL
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR auth.jwt()->>'role' = 'service_role'
);

-- Step 4: Verify you can now see data
SELECT 
    'credential_pools' as table_name,
    COUNT(*) as records_visible
FROM credential_pools
UNION ALL
SELECT 
    'transactions',
    COUNT(*)
FROM transactions
UNION ALL
SELECT 
    'admin_notifications',
    COUNT(*)
FROM admin_notifications;

-- Step 5: Check your admin status
SELECT 
    auth.uid() as your_user_id,
    auth.email() as your_email,
    p.role as your_role,
    CASE 
        WHEN p.role = 'admin' THEN '✅ You are an admin'
        ELSE '❌ You are NOT an admin'
    END as admin_status
FROM profiles p
WHERE p.id = auth.uid();