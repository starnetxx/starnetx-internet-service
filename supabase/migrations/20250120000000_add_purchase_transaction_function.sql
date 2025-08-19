-- Create a function to handle plan purchases atomically
-- This prevents race conditions and ensures data consistency
CREATE OR REPLACE FUNCTION purchase_plan_transaction(
  p_user_id UUID,
  p_plan_id UUID,
  p_location_id UUID,
  p_credential_id UUID,
  p_amount DECIMAL(10,2),
  p_duration_hours INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_balance DECIMAL(10,2);
  v_credential_status TEXT;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock the user profile row to prevent concurrent balance updates
    SELECT wallet_balance INTO v_user_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists and has sufficient balance
    IF v_user_balance IS NULL THEN
      RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_user_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_amount, v_user_balance;
    END IF;
    
    -- Lock the credential row to prevent concurrent assignment
    SELECT status INTO v_credential_status
    FROM credential_pools
    WHERE id = p_credential_id
    FOR UPDATE;
    
    -- Check if credential is available
    IF v_credential_status != 'available' THEN
      RAISE EXCEPTION 'Credential not available. Status: %', v_credential_status;
    END IF;
    
    -- Deduct amount from user wallet
    UPDATE profiles
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = p_user_id;
    
    -- Mark credential as used
    UPDATE credential_pools
    SET 
      status = 'used',
      assigned_to = p_user_id,
      assigned_at = NOW(),
      updated_at = NOW()
    WHERE id = p_credential_id;
    
    -- Create transaction record
    INSERT INTO transactions (
      user_id,
      plan_id,
      location_id,
      credential_id,
      amount,
      type,
      status,
      mikrotik_username,
      mikrotik_password,
      purchase_date,
      expires_at
    ) VALUES (
      p_user_id,
      p_plan_id,
      p_location_id,
      p_credential_id,
      p_amount,
      'plan_purchase',
      'completed',
      (SELECT username FROM credential_pools WHERE id = p_credential_id),
      (SELECT password FROM credential_pools WHERE id = p_credential_id),
      NOW(),
      NOW() + INTERVAL '1 hour' * p_duration_hours
    ) RETURNING id INTO v_transaction_id;
    
    -- Return success result
    v_result := jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'user_id', p_user_id,
      'plan_id', p_plan_id,
      'location_id', p_location_id,
      'credential_id', p_credential_id,
      'amount', p_amount,
      'expires_at', NOW() + INTERVAL '1 hour' * p_duration_hours
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE EXCEPTION 'Purchase failed: %', SQLERRM;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_plan_transaction(UUID, UUID, UUID, UUID, DECIMAL, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION purchase_plan_transaction IS 'Atomic function to handle plan purchases with proper locking to prevent race conditions';
