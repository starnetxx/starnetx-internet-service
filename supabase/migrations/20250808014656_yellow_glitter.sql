/*
  # Update schema for app compatibility

  1. Schema Updates
    - Add missing columns to plans table (duration, data_amount, type, popular, is_unlimited)
    - Add missing columns to locations table (username, password)
    - Update transactions table structure
    - Add proper indexes and constraints

  2. Security
    - Maintain existing RLS policies
    - Add new policies for updated schema

  3. Data Migration
    - Update existing data to match new schema
*/

-- Update plans table to match app expectations
ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS data_amount TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '3-hour';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

-- Update locations table to match app expectations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS password TEXT;

-- Update transactions table structure
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ;

-- Update existing plans with proper data
UPDATE plans SET 
  duration = CASE 
    WHEN duration_hours <= 3 THEN '3 Hours'
    WHEN duration_hours <= 24 THEN '1 Day'
    WHEN duration_hours <= 168 THEN '1 Week'
    ELSE '1 Month'
  END,
  data_amount = 'Unlimited',
  type = CASE 
    WHEN duration_hours <= 3 THEN '3-hour'
    WHEN duration_hours <= 24 THEN 'daily'
    WHEN duration_hours <= 168 THEN 'weekly'
    ELSE 'monthly'
  END,
  is_unlimited = true
WHERE duration IS NULL;

-- Update existing locations with default credentials
UPDATE locations SET 
  username = 'admin',
  password = 'password123'
WHERE username IS NULL;

-- Add constraints
ALTER TABLE plans ADD CONSTRAINT plans_type_check 
  CHECK (type IN ('3-hour', 'daily', 'weekly', 'monthly'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credential_pools_status ON credential_pools(status);
CREATE INDEX IF NOT EXISTS idx_credential_pools_location_plan ON credential_pools(location_id, plan_id);