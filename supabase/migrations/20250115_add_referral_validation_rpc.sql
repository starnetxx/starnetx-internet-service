/*
  # Add RPC function for referral code validation
  
  1. New Functions
    - validate_referral_code: Safely check if a referral code exists and get the referrer ID
    - This function can be called by anonymous users during registration
    
  2. Security
    - Function is SECURITY DEFINER to bypass RLS
    - Only returns the referrer ID if code is valid, null otherwise
    - No sensitive information is exposed
*/

-- Create a function to validate referral codes and get referrer ID
CREATE OR REPLACE FUNCTION validate_referral_code(code text)
RETURNS uuid AS $$
DECLARE
  referrer_id uuid;
BEGIN
  -- Check if the referral code exists and get the user ID
  SELECT id INTO referrer_id
  FROM profiles
  WHERE referral_code = UPPER(code)
  LIMIT 1;
  
  -- Return the referrer ID if found, NULL otherwise
  RETURN referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION validate_referral_code TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION validate_referral_code IS 'Validates a referral code and returns the referrer user ID if valid, NULL if invalid';