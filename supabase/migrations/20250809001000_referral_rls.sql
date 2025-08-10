-- Allow users to view profiles they referred
CREATE POLICY IF NOT EXISTS "Users can view referred users" ON public.profiles
  FOR SELECT TO authenticated
  USING (referred_by = uid());

-- Allow users to view transactions made by users they referred
CREATE POLICY IF NOT EXISTS "Users can view transactions of referred users" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.referred_by = uid()
    )
  );

