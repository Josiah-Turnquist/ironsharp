-- ============================================================
-- IronSharp – Full Database Schema
-- Apply this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fezrfefkpeeivguyvvpx/sql/new
-- ============================================================

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ DEVOTIONAL PLANS ============
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

ALTER TABLE public.devotional_plans ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_devotional_plans_updated_at
  BEFORE UPDATE ON public.devotional_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated users can view plans"
  ON public.devotional_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view plans"
  ON public.devotional_plans FOR SELECT TO anon USING (true);

-- ============ DEVOTIONAL DAYS ============
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

ALTER TABLE public.devotional_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view days"
  ON public.devotional_days FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view days"
  ON public.devotional_days FOR SELECT TO anon USING (true);

-- ============ USER PLAN PROGRESS ============
CREATE TABLE public.user_plan_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  current_day INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, plan_id)
);

ALTER TABLE public.user_plan_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_plan_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can start a plan"
  ON public.user_plan_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_plan_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.user_plan_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ STUDY NOTES ============
CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  passage_reference TEXT NOT NULL,
  source TEXT,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, day_number)
);

CREATE INDEX idx_study_notes_plan_day ON public.study_notes(plan_id, day_number);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view study notes"
  ON public.study_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated users can view study notes"
  ON public.study_notes FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_study_notes_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  primary_role TEXT NOT NULL DEFAULT 'disciple' CHECK (primary_role IN ('discipler','disciple','partner')),
  streak_count INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,
  church_name TEXT,
  -- survey fields
  survey_name TEXT,
  survey_age_range TEXT,
  survey_state TEXT,
  survey_education TEXT,
  survey_has_church BOOLEAN,
  survey_church_name TEXT,
  survey_devotional_rating INTEGER,
  survey_faith_journey TEXT,
  survey_goals TEXT[],
  survey_completed_at TIMESTAMPTZ,
  -- membership fields
  membership_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (membership_tier IN ('free','connect','sharpen','family')),
  membership_started_at TIMESTAMPTZ,
  membership_expires_at TIMESTAMPTZ,
  membership_source TEXT NOT NULL DEFAULT 'none'
    CHECK (membership_source IN ('none','stripe','apple_iap','google_iap','promo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authed" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles readable by anon" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ GROUPS ============
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('one-on-one','family','small-group')),
  current_plan_id UUID REFERENCES public.devotional_plans(id) ON DELETE SET NULL,
  current_day INTEGER NOT NULL DEFAULT 1,
  streak_count INTEGER NOT NULL DEFAULT 0,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ GROUP MEMBERS ============
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ============ DISCIPLE RELATIONSHIPS ============
CREATE TABLE public.disciple_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipler_id UUID NOT NULL,
  disciple_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discipler_id, disciple_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciple_relationships TO authenticated;
GRANT ALL ON public.disciple_relationships TO service_role;

ALTER TABLE public.disciple_relationships ENABLE ROW LEVEL SECURITY;

-- ============ DEVOTIONAL SUBMISSIONS ============
CREATE TABLE public.devotional_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.devotional_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  response1 TEXT,
  response2 TEXT,
  prayer TEXT,
  voice_memo_url TEXT,
  q1_private BOOLEAN NOT NULL DEFAULT false,
  q2_private BOOLEAN NOT NULL DEFAULT false,
  prayer_private BOOLEAN NOT NULL DEFAULT true,
  voice_memo_private BOOLEAN NOT NULL DEFAULT false,
  submission_source TEXT NOT NULL DEFAULT 'typed' CHECK (submission_source IN ('typed','commute','voice_memo')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devotional_submissions TO authenticated;
GRANT ALL ON public.devotional_submissions TO service_role;

ALTER TABLE public.devotional_submissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON public.devotional_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_submissions_plan_day ON public.devotional_submissions(plan_id, day_number);
CREATE INDEX idx_submissions_user ON public.devotional_submissions(user_id);

-- ============ SUBMISSION REACTIONS ============
CREATE TABLE public.submission_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.devotional_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('amen','hit_me','fire')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id, reaction_type)
);

GRANT SELECT, INSERT, DELETE ON public.submission_reactions TO authenticated;
GRANT ALL ON public.submission_reactions TO service_role;

ALTER TABLE public.submission_reactions ENABLE ROW LEVEL SECURITY;

-- ============ DISCIPLER NOTES ============
CREATE TABLE public.discipler_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  note TEXT NOT NULL,
  related_submission_id UUID REFERENCES public.devotional_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.discipler_notes TO authenticated;
GRANT ALL ON public.discipler_notes TO service_role;

ALTER TABLE public.discipler_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_discipler_notes_thread ON public.discipler_notes(from_user_id, to_user_id, created_at DESC);

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.shares_group(_user_a UUID, _user_b UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members a
    JOIN public.group_members b ON a.group_id = b.group_id
    WHERE a.user_id = _user_a AND b.user_id = _user_b AND _user_a <> _user_b
  );
$$;

CREATE OR REPLACE FUNCTION public.is_discipler_of(_discipler UUID, _disciple UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disciple_relationships
    WHERE discipler_id = _discipler AND disciple_id = _disciple AND status = 'active'
  );
$$;

-- ============ POLICIES ============

-- groups
CREATE POLICY "Members view groups" ON public.groups FOR SELECT TO authenticated USING (public.is_group_member(id, auth.uid()));
CREATE POLICY "Users create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator updates group" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator deletes group" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- group_members
CREATE POLICY "View own group members" ON public.group_members FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "Join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "Leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- disciple_relationships
CREATE POLICY "View own discipleship" ON public.disciple_relationships FOR SELECT TO authenticated USING (auth.uid() IN (discipler_id, disciple_id));
CREATE POLICY "Create discipleship" ON public.disciple_relationships FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (discipler_id, disciple_id));

-- devotional_submissions
CREATE POLICY "View own + shared submissions" ON public.devotional_submissions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.shares_group(auth.uid(), user_id) OR public.is_discipler_of(auth.uid(), user_id)
);
CREATE POLICY "Insert own submission" ON public.devotional_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own submission" ON public.devotional_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own submission" ON public.devotional_submissions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- submission_reactions
CREATE POLICY "Reactions readable" ON public.submission_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users react" ON public.submission_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unreact" ON public.submission_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- discipler_notes
CREATE POLICY "View own thread" ON public.discipler_notes FOR SELECT TO authenticated USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "Send notes" ON public.discipler_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, primary_role, streak_count, total_completed)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'disciple',
    0,
    0
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ANALYTICS VIEW ============
CREATE OR REPLACE VIEW public.submission_analytics
WITH (security_invoker=on) AS
SELECT
  user_id,
  COUNT(*) AS total_submissions,
  COUNT(*) FILTER (WHERE submission_source = 'typed') AS typed_count,
  COUNT(*) FILTER (WHERE submission_source = 'commute') AS commute_count,
  COUNT(*) FILTER (WHERE submission_source = 'voice_memo') AS voice_memo_count,
  COUNT(DISTINCT plan_id) AS plans_engaged,
  MAX(submitted_at) AS last_submission_at
FROM public.devotional_submissions
GROUP BY user_id;

GRANT SELECT ON public.submission_analytics TO authenticated;
