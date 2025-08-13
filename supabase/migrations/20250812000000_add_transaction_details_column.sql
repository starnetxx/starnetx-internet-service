-- Add missing 'details' column to transactions table
-- This column is needed for storing webhook transaction details

-- First, add the details column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS details JSONB;

-- Add index for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_transactions_details ON transactions USING GIN (details);

-- Update existing records to have empty details if null
UPDATE transactions 
SET details = '{}'::jsonb 
WHERE details IS NULL;

-- Make sure the column is not null going forward
ALTER TABLE transactions 
ALTER COLUMN details SET NOT NULL,
ALTER COLUMN details SET DEFAULT '{}'::jsonb;

-- Add wallet_funding to the allowed transaction types
-- First, drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the new constraint with wallet_funding included
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('wallet_topup', 'plan_purchase', 'wallet_funding'));

-- Fix the status constraint to allow 'success' status
-- First, drop the existing status constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add the new status constraint with 'success' included
ALTER TABLE transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'success'));

-- Add reference column if it doesn't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create index on reference for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions (reference);
