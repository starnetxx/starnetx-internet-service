-- Supabase RLS (Row Level Security) Policies for StarNetX
-- Run these in your Supabase SQL Editor

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- New users can insert their profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 3. PLANS TABLE POLICIES
-- ============================================

-- Everyone can view active plans (public)
CREATE POLICY "Anyone can view active plans" 
ON plans FOR SELECT 
USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans" 
ON plans FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 4. LOCATIONS TABLE POLICIES
-- ============================================

-- Everyone can view active locations (public)
CREATE POLICY "Anyone can view active locations" 
ON locations FOR SELECT 
USING (is_active = true);

-- Admins can manage locations
CREATE POLICY "Admins can manage locations" 
ON locations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 5. TRANSACTIONS TABLE POLICIES
-- ============================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY "Users can create own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions (for status changes)
CREATE POLICY "Users can update own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" 
ON transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 6. CREDENTIAL_POOLS TABLE POLICIES
-- ============================================

-- Users can view credentials assigned to them
CREATE POLICY "Users can view assigned credentials" 
ON credential_pools FOR SELECT 
USING (assigned_to = auth.uid());

-- Admins can manage all credentials
CREATE POLICY "Admins can manage credentials" 
ON credential_pools FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 7. NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (
  user_id = auth.uid() 
  OR user_id IS NULL -- Global notifications
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications" 
ON notifications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 8. REFERRALS TABLE POLICIES
-- ============================================

-- Users can view referrals they made
CREATE POLICY "Users can view own referrals" 
ON referrals FOR SELECT 
USING (referrer_id = auth.uid());

-- Users can view if they were referred
CREATE POLICY "Users can view if referred" 
ON referrals FOR SELECT 
USING (referred_id = auth.uid());

-- System can create referrals
CREATE POLICY "System can create referrals" 
ON referrals FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. VERIFY POLICIES
-- ============================================

-- Query to check all policies
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
ORDER BY tablename, policyname;

-- ============================================
-- 11. TEST QUERIES
-- ============================================

-- Test if current user can access their profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Test if current user can see their transactions
SELECT * FROM transactions WHERE user_id = auth.uid();

-- Test if anyone can see active plans
SELECT * FROM plans WHERE is_active = true;

-- Test if anyone can see active locations
SELECT * FROM locations WHERE is_active = true;