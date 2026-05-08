
-- Create devotional_plans table
CREATE TABLE public.devotional_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 7,
  how_to_use TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devotional_days table
CREATE TABLE public.devotional_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  chapter TEXT NOT NULL,
  theme TEXT,
  commentary TEXT NOT NULL,
  reflection_q1 TEXT NOT NULL,
  reflection_q2 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, day_number)
);

-- Create user_plan_progress table
CREATE TABLE public.user_plan_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  current_day INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, plan_id)
);

-- Enable RLS on all tables
ALTER TABLE public.devotional_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotional_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_progress ENABLE ROW LEVEL SECURITY;

-- Plans and days are readable by all authenticated users
CREATE POLICY "Authenticated users can view plans"
  ON public.devotional_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view days"
  ON public.devotional_days FOR SELECT
  TO authenticated
  USING (true);

-- User progress: users can only access their own rows
CREATE POLICY "Users can view own progress"
  ON public.user_plan_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can start a plan"
  ON public.user_plan_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_plan_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.user_plan_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Timestamp trigger for plans
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_devotional_plans_updated_at
  BEFORE UPDATE ON public.devotional_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
