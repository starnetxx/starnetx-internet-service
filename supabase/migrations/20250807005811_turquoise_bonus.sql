/*
  # Initial Schema for StarNetX Internet Provider App

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `phone` (text, nullable)
      - `wallet_balance` (numeric, default 0)
      - `referral_code` (text, unique, nullable)
      - `referred_by` (uuid, foreign key to profiles.id)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `plans`
      - `id` (uuid, primary key)
      - `name` (text)
      - `duration_hours` (integer)
      - `price` (numeric)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `locations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `wifi_name` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credential_pools`
      - `id` (uuid, primary key)
      - `location_id` (uuid, foreign key to locations.id)
      - `plan_id` (uuid, foreign key to plans.id)
      - `username` (text)
      - `password` (text)
      - `status` (text, default 'available')
      - `assigned_to` (uuid, foreign key to profiles.id, nullable)
      - `assigned_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.id)
      - `plan_id` (uuid, foreign key to plans.id, nullable)
      - `location_id` (uuid, foreign key to locations.id, nullable)
      - `credential_id` (uuid, foreign key to credential_pools.id, nullable)
      - `amount` (numeric)
      - `type` (text)
      - `status` (text, default 'completed')
      - `mikrotik_username` (text, nullable)
      - `mikrotik_password` (text, nullable)
      - `expires_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read their own data
    - Add policies for admins to manage all data
*/

-- Create custom types
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  phone text,
  wallet_balance numeric(10,2) DEFAULT 0,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES profiles(id),
  role app_role DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_hours integer NOT NULL,
  price numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  wifi_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credential_pools table
CREATE TABLE IF NOT EXISTS credential_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  username text NOT NULL,
  password text NOT NULL,
  status text DEFAULT 'available' CHECK (status IN ('available', 'used', 'disabled')),
  assigned_to uuid REFERENCES profiles(id),
  assigned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(location_id, plan_id, username)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  location_id uuid REFERENCES locations(id),
  credential_id uuid REFERENCES credential_pools(id),
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('wallet_topup', 'plan_purchase')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  mikrotik_username text,
  mikrotik_password text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS app_role AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user ID
CREATE OR REPLACE FUNCTION uid() RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL TO authenticated
  USING (get_user_role(uid()) = 'admin');

-- Plans policies
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON plans
  FOR ALL TO authenticated
  USING (get_user_role(uid()) = 'admin');

-- Locations policies
CREATE POLICY "Anyone can view active locations" ON locations
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL TO authenticated
  USING (get_user_role(uid()) = 'admin');

-- Credential pools policies
CREATE POLICY "Users can view their assigned credentials" ON credential_pools
  FOR SELECT TO authenticated
  USING (assigned_to = uid());

CREATE POLICY "Admins can manage credentials" ON credential_pools
  FOR ALL TO authenticated
  USING (get_user_role(uid()) = 'admin');

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT TO authenticated
  USING (user_id = uid());

CREATE POLICY "Users can create own transactions" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = uid());

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR ALL TO authenticated
  USING (get_user_role(uid()) = 'admin');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credential_pools_updated_at
  BEFORE UPDATE ON credential_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();