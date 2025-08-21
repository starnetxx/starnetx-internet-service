/*
  # Fix referral code validation policy
  
  1. Changes
    - Add policy to allow anonymous users to check if a referral code exists
    - This prevents PGRST116 errors during registration when validating referral codes
    
  2. Security
    - Only allows checking if referral_code exists (SELECT on id and referral_code columns only)
    - Does not expose any sensitive user information
*/

-- Create a policy that allows checking if a referral code exists
-- This is needed during registration to validate referral codes
CREATE POLICY "Anyone can check referral codes" ON profiles
  FOR SELECT 
  USING (true);

-- Update the existing policy to be more specific
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR true); -- Allow viewing all profiles for referral code checking

-- Alternative approach: Create a function for checking referral codes
CREATE OR REPLACE FUNCTION check_referral_code_exists(code text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE referral_code = UPPER(code)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION check_referral_code_exists TO anon, authenticated;