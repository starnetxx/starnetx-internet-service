-- Create Notifications Table for StarNetX
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CREATE ADMIN_NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  priority INTEGER DEFAULT 0,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'users', 'admins')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_active 
ON admin_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_dates 
ON admin_notifications(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_target 
ON admin_notifications(target_audience);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON admin_notifications;

-- Anyone can view active notifications (based on target audience)
CREATE POLICY "Anyone can view active notifications" 
ON admin_notifications FOR SELECT 
USING (
  is_active = true 
  AND (
    target_audience = 'all' 
    OR (
      target_audience = 'users' 
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'user')
    )
    OR (
      target_audience = 'admins' 
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
  AND (start_date IS NULL OR start_date <= NOW())
  AND (end_date IS NULL OR end_date >= NOW())
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" 
ON admin_notifications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================
-- 5. CREATE FUNCTION FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_admin_notifications_updated_at ON admin_notifications;

CREATE TRIGGER update_admin_notifications_updated_at
BEFORE UPDATE ON admin_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INSERT SAMPLE NOTIFICATION (Optional)
-- ============================================

-- Uncomment to add a welcome notification
/*
INSERT INTO admin_notifications (
  title,
  message,
  type,
  priority,
  target_audience,
  is_active
) VALUES (
  'Welcome to StarNetX!',
  'Thank you for joining our network. Enjoy fast and reliable internet service.',
  'success',
  1,
  'all',
  true
);
*/

-- ============================================
-- 8. VERIFY TABLE CREATION
-- ============================================

-- Check if table was created successfully
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;

-- Check policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'admin_notifications';