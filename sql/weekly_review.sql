-- مرور هفتگی (2026-09-26): the AI report became weekly and interactive.
--
-- The report is written once a week, Friday evening (cron below, 14:00 UTC =
-- 17:00 Baghdad), covering the last 7 days. Its reshuffle is no longer applied
-- on the spot: every change in `replan.changes` now carries a status —
--   'pending'   waiting for the user in the review
--   'accepted'  the user took the proposal as is
--   'edited'    the user took it with a date of their own (after.date updated)
--   'rejected'  the user kept the task as it was
--   'auto'      nobody decided before replan_apply_after, so the function applied it
--   'skipped'   auto-apply found the task finished, gone, or changed by hand
--   'expired'   a newer review replaced it before anyone decided
-- Reports from before this change have no status; they were applied at once
-- (treated as 'auto', so «برگردون همه‌چی» still works on them).
--
-- focus = { suggested: [{ task_id, title, why }], chosen: [task_id, …] }
--   هوشواره proposes candidates for next week's three priorities; the user
--   picks up to three and they're pinned on امروز until the next review.
--
-- ai_reports already has the owner-only policy, grants, realtime and backup.

alter table public.ai_reports add column if not exists replan_apply_after timestamptz;
alter table public.ai_reports add column if not exists focus jsonb;

select cron.alter_job(jobid, schedule := '0 14 * * *') from cron.job where jobname = 'daily-ai-report-check';
