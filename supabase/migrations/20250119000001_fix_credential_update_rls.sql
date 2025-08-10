-- Allow users to update credential status when purchasing (assign to themselves)

-- Add policy to allow users to update available credentials to assign them to themselves
CREATE POLICY "Users can assign available credentials to themselves" ON credential_pools
  FOR UPDATE TO authenticated
  USING (status = 'available' AND assigned_to IS NULL)
  WITH CHECK (assigned_to = auth.uid() AND status = 'used');
