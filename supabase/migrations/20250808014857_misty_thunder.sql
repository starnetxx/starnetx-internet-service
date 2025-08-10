/*
  # Add handle_new_user trigger

  1. Function
    - Creates a profile for new users automatically
    - Generates referral code
    - Sets default values

  2. Trigger
    - Fires on auth.users insert
    - Calls handle_new_user function
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    phone,
    wallet_balance,
    referral_code,
    referred_by,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    0,
    COALESCE(NEW.raw_user_meta_data->>'referral_code', UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))),
    COALESCE((NEW.raw_user_meta_data->>'referred_by')::UUID, NULL),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();