
-- Demo user UUID: '00000000-0000-0000-0000-000000000001'

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
CREATE POLICY "Demo inserts profile" ON public.profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Demo updates profile" ON public.profiles FOR UPDATE TO anon USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO anon;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO anon;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciple_relationships TO anon;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devotional_submissions TO anon;
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
GRANT SELECT, INSERT, DELETE ON public.submission_reactions TO anon;
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
GRANT SELECT, INSERT, DELETE ON public.discipler_notes TO anon;
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

-- ============ POLICIES (after helpers exist) ============

-- groups
CREATE POLICY "Members view groups" ON public.groups FOR SELECT TO authenticated USING (public.is_group_member(id, auth.uid()));
CREATE POLICY "Demo views groups" ON public.groups FOR SELECT TO anon USING (public.is_group_member(id, '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Users create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Demo creates groups" ON public.groups FOR INSERT TO anon WITH CHECK (created_by = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "Creator updates group" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Demo updates group" ON public.groups FOR UPDATE TO anon USING (created_by = '00000000-0000-0000-0000-000000000001'::uuid);

-- group_members
CREATE POLICY "View own group members" ON public.group_members FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "Demo views members" ON public.group_members FOR SELECT TO anon USING (public.is_group_member(group_id, '00000000-0000-0000-0000-000000000001'::uuid));
CREATE POLICY "Join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "Demo joins" ON public.group_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Demo removes" ON public.group_members FOR DELETE TO anon USING (public.is_group_member(group_id, '00000000-0000-0000-0000-000000000001'::uuid));

-- disciple_relationships
CREATE POLICY "View own discipleship" ON public.disciple_relationships FOR SELECT TO authenticated USING (auth.uid() IN (discipler_id, disciple_id));
CREATE POLICY "Demo views" ON public.disciple_relationships FOR SELECT TO anon USING ('00000000-0000-0000-0000-000000000001'::uuid IN (discipler_id, disciple_id));
CREATE POLICY "Create discipleship" ON public.disciple_relationships FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (discipler_id, disciple_id));
CREATE POLICY "Demo creates" ON public.disciple_relationships FOR INSERT TO anon WITH CHECK (true);

-- devotional_submissions
CREATE POLICY "View own + shared submissions" ON public.devotional_submissions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.shares_group(auth.uid(), user_id) OR public.is_discipler_of(auth.uid(), user_id)
);
CREATE POLICY "Demo views submissions" ON public.devotional_submissions FOR SELECT TO anon USING (
  user_id = '00000000-0000-0000-0000-000000000001'::uuid
  OR public.shares_group('00000000-0000-0000-0000-000000000001'::uuid, user_id)
  OR public.is_discipler_of('00000000-0000-0000-0000-000000000001'::uuid, user_id)
);
CREATE POLICY "Insert own submission" ON public.devotional_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Demo inserts" ON public.devotional_submissions FOR INSERT TO anon WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "Update own submission" ON public.devotional_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Demo updates" ON public.devotional_submissions FOR UPDATE TO anon USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "Delete own submission" ON public.devotional_submissions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- submission_reactions
CREATE POLICY "Reactions readable" ON public.submission_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Demo reads reactions" ON public.submission_reactions FOR SELECT TO anon USING (true);
CREATE POLICY "Users react" ON public.submission_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Demo reacts" ON public.submission_reactions FOR INSERT TO anon WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "Users unreact" ON public.submission_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Demo unreacts" ON public.submission_reactions FOR DELETE TO anon USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- discipler_notes
CREATE POLICY "View own thread" ON public.discipler_notes FOR SELECT TO authenticated USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "Demo views notes" ON public.discipler_notes FOR SELECT TO anon USING ('00000000-0000-0000-0000-000000000001'::uuid IN (from_user_id, to_user_id));
CREATE POLICY "Send notes" ON public.discipler_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Demo sends" ON public.discipler_notes FOR INSERT TO anon WITH CHECK (from_user_id = '00000000-0000-0000-0000-000000000001'::uuid);

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
GRANT SELECT ON public.submission_analytics TO anon;
