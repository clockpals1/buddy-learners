-- ============================================================
-- Leafva Academy – COMPLETE schema  (fully idempotent — safe to re-run)
-- Supabase SQL Editor → paste all → Run
-- ============================================================

-- Drop all policies first so re-runs don't error
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at   ON public.profiles;
DROP TRIGGER IF EXISTS trg_children_updated_at   ON public.children;
DROP TRIGGER IF EXISTS trg_enrollments_updated_at ON public.enrollments;
DROP TRIGGER IF EXISTS on_auth_user_created       ON auth.users;

-- ── Enums (idempotent) ───────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'instructor', 'parent', 'child');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track AS ENUM ('explorers', 'juniors', 'scholars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'active', 'cancelled', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meeting_provider AS ENUM ('zoom', 'teams', 'meet', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Utility: updated_at trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ── has_role helper ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── User roles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ── Auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  -- Default role = parent
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Plans ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'month',
  features JSONB,
  stripe_price_id TEXT,
  paypal_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active plans" ON public.plans FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

-- Insert default plans
INSERT INTO public.plans (name, price_usd, interval, features) VALUES
  ('Free', 0, 'month', '["1 child","Basic lessons","Community access"]'),
  ('Family', 19.99, 'month', '["Up to 3 children","All lessons","Live sessions","AI tutor","Priority support"]'),
  ('School', 49.99, 'month', '["Up to 10 children","All features","Admin dashboard","Custom curriculum","Dedicated support"]');

-- ── Children ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  track public.track NOT NULL DEFAULT 'explorers',
  avatar_seed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own children" ON public.children FOR ALL TO authenticated
  USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Admins read all children" ON public.children FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;
CREATE TRIGGER trg_children_updated_at BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Consent records ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL DEFAULT 'v1.0',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own consents" ON public.consent_records FOR ALL TO authenticated
  USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;

-- ── Enrollments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status public.payment_status NOT NULL DEFAULT 'pending',
  stripe_subscription_id TEXT,
  paypal_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT SELECT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Promo codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_pct INTEGER NOT NULL DEFAULT 10 CHECK (discount_pct BETWEEN 1 AND 100),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read active promos" ON public.promo_codes FOR SELECT TO authenticated
  USING (is_active AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins manage promos" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

-- ── Integration settings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage integrations" ON public.integration_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT ALL ON public.integration_settings TO service_role;

-- ── Audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- ── Courses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track public.track NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published courses" ON public.courses FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;

-- ── Lessons ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'video',
  content_url TEXT,
  game_slug TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published lessons" ON public.lessons FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;

-- ── Lesson progress ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read child progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Parents update child progress" ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

-- ── Badge definitions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  track public.track,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.badge_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badges" ON public.badge_defs FOR SELECT TO anon, authenticated USING (TRUE);
GRANT SELECT ON public.badge_defs TO anon, authenticated;
GRANT ALL ON public.badge_defs TO service_role;

-- ── Child badges ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.child_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badge_defs(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, badge_id)
);
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read child badges" ON public.child_badges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
GRANT SELECT ON public.child_badges TO authenticated;
GRANT ALL ON public.child_badges TO service_role;

-- ── Live sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  track public.track,
  instructor_id UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_url TEXT,
  meeting_provider public.meeting_provider,
  max_participants INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  agenda TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published sessions" ON public.live_sessions FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins manage sessions" ON public.live_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
GRANT SELECT ON public.live_sessions TO anon, authenticated;
GRANT ALL ON public.live_sessions TO service_role;

-- ── Session attendance ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  UNIQUE (session_id, child_id)
);
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read attendance" ON public.session_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
GRANT SELECT, INSERT ON public.session_attendance TO authenticated;
GRANT ALL ON public.session_attendance TO service_role;

-- ── Assignments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id),
  title TEXT NOT NULL,
  description TEXT,
  track public.track,
  due_at TIMESTAMPTZ,
  max_score INTEGER NOT NULL DEFAULT 100,
  rubric TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads assignments" ON public.assignments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
GRANT SELECT ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

-- ── Submissions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, child_id)
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read child submissions" ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
GRANT SELECT, INSERT ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

-- ── AI request log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  child_id UUID REFERENCES public.children(id),
  model TEXT,
  tokens_used INTEGER,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read AI log" ON public.ai_request_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
GRANT INSERT ON public.ai_request_log TO authenticated;
GRANT ALL ON public.ai_request_log TO service_role;
