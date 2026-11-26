-- 2026-09-26: superseded in part by weekly_review.sql — the report is weekly now and
-- its changes wait for the user (status per change) instead of applying at once.
--
-- Auto-replan: when the 4-day AI report finds a really bad stretch, the
-- generate-ai-report function reshuffles open tasks itself and records what it
-- changed here, so the app can show the list and put everything back.
--
-- replan = {
--   reason:       text,   -- why the AI judged the stretch as bad
--   capacity_min: int,    -- daily capacity it planned against (from the user's own good days)
--   changes: [{ task_id, title, why,
--               before: { date, priority, duration_min },
--               after:  { date, priority, duration_min } }]   -- date null = «بعداً»
-- }
-- replan_reverted_at is set when the user taps «برگردون همه‌چی».
-- ai_reports already has the owner-only policy, grants and realtime (auth.sql).

alter table public.ai_reports add column if not exists replan jsonb;
alter table public.ai_reports add column if not exists replan_reverted_at timestamptz;
