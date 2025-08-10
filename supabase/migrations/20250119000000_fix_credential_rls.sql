-- Fix credential_pools RLS to allow users to view available credentials for purchasing

-- Add policy to allow users to view available (unassigned) credentials
CREATE POLICY "Users can view available credentials for purchase" ON credential_pools
  FOR SELECT TO authenticated
  USING (status = 'available' AND assigned_to IS NULL);
