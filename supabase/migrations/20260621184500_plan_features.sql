-- Add plan feature associations and manual enrollment support

-- Add is_free flag to games (or we can use a separate table for free games)
-- For now, let's add a column to mark free games in a game_config table
CREATE TABLE IF NOT EXISTS public.game_config (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT false,
  min_plan_kind TEXT, -- 'free', 'family', 'school' - minimum plan required
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert game configurations
INSERT INTO public.game_config (slug, name, is_free, min_plan_kind) VALUES
  ('pixel-pet-coder', 'Pixel Pet Coder', true, 'free'),
  ('typing-ninjas', 'Typing Ninjas', true, 'free'),
  ('packet-race', 'Packet Race', false, 'family'),
  ('bug-hunt-squad', 'Bug Hunt Squad', false, 'family'),
  ('scam-spotter', 'Scam Spotter', false, 'school'),
  ('cipher-quest', 'Cipher Quest', false, 'school'),
  ('ai-buddy-builder', 'AI Buddy Builder', false, 'school'),
  ('ctf-jr', 'Capture the Flag Jr.', false, 'school')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_free = EXCLUDED.is_free,
  min_plan_kind = EXCLUDED.min_plan_kind,
  updated_at = now();

-- Add plan features table to define what each plan includes
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL, -- 'lessons', 'games', 'live_sessions', 'ai_tutor', 'curriculum'
  access_level TEXT NOT NULL, -- 'full', 'limited', 'none'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_type)
);

-- Insert default plan features
-- Free plan: limited lessons, free games only, no live sessions, no AI tutor
INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'lessons', 'limited' FROM public.plans WHERE kind = 'free'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'games', 'free_only' FROM public.plans WHERE kind = 'free'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'live_sessions', 'none' FROM public.plans WHERE kind = 'free'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'ai_tutor', 'none' FROM public.plans WHERE kind = 'free'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

-- Family plan: full lessons, all games, live sessions, AI tutor
INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'lessons', 'full' FROM public.plans WHERE kind = 'family'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'games', 'full' FROM public.plans WHERE kind = 'family'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'live_sessions', 'full' FROM public.plans WHERE kind = 'family'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'ai_tutor', 'full' FROM public.plans WHERE kind = 'family'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

-- School plan: everything plus curriculum management
INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'lessons', 'full' FROM public.plans WHERE kind = 'school'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'games', 'full' FROM public.plans WHERE kind = 'school'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'live_sessions', 'full' FROM public.plans WHERE kind = 'school'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'ai_tutor', 'full' FROM public.plans WHERE kind = 'school'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_type, access_level)
SELECT id, 'curriculum', 'full' FROM public.plans WHERE kind = 'school'
ON CONFLICT (plan_id, feature_type) DO NOTHING;

-- Add manual enrollment flag to enrollments (for admin upgrades)
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS upgraded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMPTZ;

-- Add RLS for game_config
ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read game config" ON public.game_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage game config" ON public.game_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Add RLS for plan_features
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan features" ON public.plan_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plan features" ON public.plan_features FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Update enrollment RLS to allow admins to update manual enrollments
DROP POLICY IF EXISTS "Admins manage enrollments" ON public.enrollments;
CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'instructor'));
