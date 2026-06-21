
-- ============================================================
-- Leafva Academy – Schema v2 (full expanded schema)
-- ============================================================

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track public.track NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published courses" ON public.courses FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Lessons
CREATE TABLE public.lessons (
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
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published lessons" ON public.lessons FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Lesson progress (per child per lesson)
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage children progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Admins view all progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Badge definitions (catalog)
CREATE TABLE public.badge_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT NOT NULL DEFAULT '🏅',
  track public.track,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badge_defs TO anon, authenticated;
GRANT ALL ON public.badge_defs TO service_role;
ALTER TABLE public.badge_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badge defs" ON public.badge_defs FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Admins manage badge defs" ON public.badge_defs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Child badges earned
CREATE TABLE public.child_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL REFERENCES public.badge_defs(slug),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, badge_slug)
);
GRANT SELECT, INSERT ON public.child_badges TO authenticated;
GRANT ALL ON public.child_badges TO service_role;
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view children badges" ON public.child_badges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Admins view all badges" ON public.child_badges FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Service inserts badges" ON public.child_badges FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- Meeting provider enum
CREATE TYPE public.meeting_provider AS ENUM ('zoom', 'teams', 'google_meet', 'custom');

-- Live sessions
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  track public.track,
  provider public.meeting_provider NOT NULL DEFAULT 'zoom',
  meeting_url TEXT,
  meeting_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  instructor_id UUID REFERENCES auth.users(id),
  max_attendees INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view published sessions" ON public.live_sessions FOR SELECT TO authenticated USING (is_published);
CREATE POLICY "Admins view all sessions" ON public.live_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins manage sessions" ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins update sessions" ON public.live_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins delete sessions" ON public.live_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE TRIGGER sessions_touch BEFORE UPDATE ON public.live_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  track public.track,
  title TEXT NOT NULL,
  description TEXT,
  rubric TEXT,
  due_at TIMESTAMPTZ,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view assignments" ON public.assignments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade INTEGER,
  feedback TEXT,
  ai_draft_grade INTEGER,
  ai_draft_feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, child_id)
);
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents view children submissions" ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Parents insert submissions" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Admins manage submissions" ON public.submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Integration settings — super_admin only, keys never hardcoded
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  label TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage integration settings" ON public.integration_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_pct INTEGER NOT NULL CHECK (discount_pct BETWEEN 1 AND 100),
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated check promo codes" ON public.promo_codes FOR SELECT TO authenticated USING (is_active);

-- Audit log (who changed what, when — especially for integration settings)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated insert audit log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- AI request log (rate limiting + safety review)
CREATE TABLE public.ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  model TEXT,
  tokens_used INTEGER,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_request_log TO service_role;
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai log" ON public.ai_request_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Session attendance
CREATE TABLE public.session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE (session_id, child_id)
);
GRANT SELECT, INSERT, UPDATE ON public.session_attendance TO authenticated;
GRANT ALL ON public.session_attendance TO service_role;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage attendance" ON public.session_attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Admins view all attendance" ON public.session_attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));

-- Seed: Badge catalog
INSERT INTO public.badge_defs (slug, name, description, icon_emoji, track) VALUES
  ('first_lesson', 'First Steps', 'Completed your very first lesson!', '🌱', NULL),
  ('week_1_complete', 'Week 1 Hero', 'Finished all Week 1 lessons', '⭐', NULL),
  ('game_master', 'Game Master', 'Played 5 different games', '🎮', NULL),
  ('code_cub', 'Code Cub', 'Wrote your first block of code', '🦊', 'spark_cubs'),
  ('ranger_badge', 'Ranger Badge', 'Completed intro Python module', '🛡️', 'code_rangers'),
  ('pioneer_shield', 'Pioneer Shield', 'Built your first AI chatbot', '⚡', 'cyber_pioneers'),
  ('scam_buster', 'Scam Buster', 'Spotted 10 phishing attempts in Scam Spotter', '🔍', 'code_rangers'),
  ('cipher_breaker', 'Cipher Breaker', 'Decoded your first cipher in Cipher Quest', '🔐', 'cyber_pioneers'),
  ('demo_day', 'Demo Day Star', 'Showcased your project on Demo Day', '🏆', NULL),
  ('streak_7', 'Week Streak', '7 days of learning in a row', '🔥', NULL),
  ('typing_ninja', 'Typing Ninja', 'Hit 30 WPM in Typing Ninjas', '⌨️', NULL),
  ('packet_racer', 'Packet Racer', 'Won 3 races in Packet Race', '📦', 'code_rangers');

-- Seed: Sample courses
INSERT INTO public.courses (track, title, description, week_number, order_index, is_published) VALUES
  ('spark_cubs', 'Welcome to Coding', 'Your first steps into the world of code — no experience needed!', 1, 0, TRUE),
  ('spark_cubs', 'What is the Internet?', 'Learn how computers talk to each other using simple stories', 2, 1, TRUE),
  ('spark_cubs', 'AI is Your Friend', 'Meet your AI buddy and discover what it can do', 3, 2, TRUE),
  ('code_rangers', 'Intro to Python', 'Start coding with Python — the world''s most beginner-friendly language', 1, 0, TRUE),
  ('code_rangers', 'How Data Travels', 'See how data packets zip around the internet in Packet Race', 2, 1, TRUE),
  ('code_rangers', 'Spot the Scam', 'Become a cyber detective with Scam Spotter missions', 3, 2, TRUE),
  ('cyber_pioneers', 'Python & JavaScript Deep Dive', 'Real code, real projects — build things that actually run', 1, 0, TRUE),
  ('cyber_pioneers', 'Building AI Chatbots with Groq', 'Use the Groq API to build your own chatbot powered by Llama 3', 2, 1, TRUE),
  ('cyber_pioneers', 'Networks & Ethical Hacking', 'Learn IP, packets, firewalls — and play Capture the Flag (sandboxed)', 3, 2, TRUE);
