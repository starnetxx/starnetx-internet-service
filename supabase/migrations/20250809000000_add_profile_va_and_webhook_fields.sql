-- Add missing profile columns for virtual accounts and user names
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS bvn text,
  ADD COLUMN IF NOT EXISTS virtual_account_number text,
  ADD COLUMN IF NOT EXISTS virtual_account_bank_name text,
  ADD COLUMN IF NOT EXISTS virtual_account_reference text;

-- Add fields to transactions for Flutterwave details and metadata
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS flutterwave_reference text,
  ADD COLUMN IF NOT EXISTS flutterwave_tx_ref text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Helpful index for webhook idempotency
CREATE INDEX IF NOT EXISTS idx_transactions_flw_tx_ref ON public.transactions (flutterwave_tx_ref);

