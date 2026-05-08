
-- Allow anon to read plans and days for demo/preview mode
CREATE POLICY "Anyone can view plans"
  ON public.devotional_plans FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can view days"
  ON public.devotional_days FOR SELECT
  TO anon
  USING (true);
