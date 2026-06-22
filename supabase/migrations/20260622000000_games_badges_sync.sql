-- ── Game config: add new games ───────────────────────────────────────────────
-- math-maze is free, security-sentinel and python-quest require family plan
-- packet-race (now Network Builder) made free
INSERT INTO public.game_config (slug, name, is_free, min_plan_kind) VALUES
  ('math-maze',          'Math Maze Master',    true,  'free'),
  ('security-sentinel',  'Security Sentinel',   false, 'family'),
  ('python-quest',       'Python Quest',        false, 'family')
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  is_free       = EXCLUDED.is_free,
  min_plan_kind = EXCLUDED.min_plan_kind,
  updated_at    = now();

-- Make packet-race (Network Builder) free
UPDATE public.game_config
SET is_free = true, min_plan_kind = 'free', updated_at = now()
WHERE slug = 'packet-race';

-- Make bug-hunt-squad available on free plan too
UPDATE public.game_config
SET is_free = true, min_plan_kind = 'free', updated_at = now()
WHERE slug = 'bug-hunt-squad';

-- ── New badge definitions for game achievements ───────────────────────────────
INSERT INTO public.badge_defs (slug, name, description, icon_emoji, track) VALUES
  ('math_explorer',       'Math Explorer',         'Completed your first Math Maze!',                     '🗺️',  NULL),
  ('math_master',         'Math Master',           'Solved 10 math doors in Math Maze',                  '🧮',  NULL),
  ('network_builder',     'Network Builder',       'Built your first computer network!',                 '🌐',  'spark_cubs'),
  ('security_recruit',    'Security Recruit',      'Completed your first Security Sentinel mission!',    '🛡️',  'code_rangers'),
  ('password_guardian',   'Password Guardian',     'Built an unbreakable password in Security Sentinel', '🔐',  'code_rangers'),
  ('phishing_detective',  'Phishing Detective',    'Spotted all phishing emails in Security Sentinel',   '🕵️',  'code_rangers'),
  ('firewall_hero',       'Firewall Hero',         'Blocked all threats in Security Sentinel',           '🚧',  'code_rangers'),
  ('python_hello',        'Hello, Python!',        'Wrote your first Python line in Python Quest!',      '🐍',  'code_rangers'),
  ('python_apprentice',   'Python Apprentice',     'Completed World 1 of Python Quest',                  '🏰',  'code_rangers'),
  ('python_ranger',       'Python Ranger',         'Completed 3 worlds of Python Quest',                 '⛰️',  'code_rangers'),
  ('loop_master',         'Loop Master',           'Mastered for and while loops in Python Quest',       '🌀',  'code_rangers'),
  ('function_wizard',     'Function Wizard',       'Wrote reusable functions in Python Quest',           '✨',  'code_rangers'),
  ('cyber_pioneer_badge', 'Cyber Pioneer',         'Completed all free Security Sentinel worlds',        '⚡',  'cyber_pioneers')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_emoji  = EXCLUDED.icon_emoji,
  track       = EXCLUDED.track;
