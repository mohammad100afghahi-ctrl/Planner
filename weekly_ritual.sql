-- مرور هفته (2026-10-21): the weekly AI report became a short Friday ritual.
-- No narrative, no focus picks, no auto-apply. Each Friday generate-ai-report
-- prepares one ai_reports row (report_text = '') whose `ritual` the app walks
-- through in four steps:
--   1. last week's commitment kept? + «چی جلوت رو گرفت؟»
--   2. stuck tasks (postponed 3+ times, or untouched 4+ weeks): break / shelve / keep
--   3. place this week's tasks on days, against the daily capacity
--   4. pick one commitment, pinned on امروز until the next ritual
--
-- ritual = {
--   step: 0-4,                                  -- where the user is (4 = done)
--   prev_commitment: { task_id, title } | null, -- from the previous finished ritual
--   prev_kept: bool | null,
--   blocker: 'time'|'energy'|'too_big'|'urgent'|'forgot'|'other' | null, blocker_note: text,
--   stuck: [{ task_id, title, moved, idle_days, decision: 'break'|'shelve'|'keep'|null, step_task_id }],
--   commitment: { task_id, title } | null
-- }
-- completed_at is set when step 4 is confirmed. replan keeps its shape and its
-- per-change status (accepted / edited / rejected), now decided in step 3.
-- Rows with ritual null are the old narrative reports: kept for the backup,
-- no longer shown.
--
-- ai_reports already has the owner-only policy, grants, realtime and backup.

alter table public.ai_reports add column if not exists ritual jsonb;
alter table public.ai_reports add column if not exists completed_at timestamptz;

-- «کنار گذاشته‌ها»: a shelved task leaves every list (app, review, push,
-- reminders) but isn't deleted; the archive page brings it back.
alter table public.tasks add column if not exists shelved_at timestamptz;

-- last time the user changed something about the task, for «۴ هفته دست‌نخورده».
-- Only user-facing fields count: the reminder cron's own bookkeeping doesn't.
-- nullable: a backup taken before this column existed restores it as null
-- (backups.sql's jsonb_populate_recordset), and readers fall back to created_at.
alter table public.tasks add column if not exists updated_at timestamptz default now();
update public.tasks t set updated_at = greatest(
  t.created_at,
  coalesce(t.completed_at, t.created_at),
  coalesce((select max(c.changed_at) from public.task_date_changes c where c.task_id = t.id), t.created_at)
);

create or replace function public.touch_task_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.title, new.notes, new.date, new.priority, new.duration_min, new.done, new.shelved_at)
     is distinct from (old.title, old.notes, old.date, old.priority, old.duration_min, old.done, old.shelved_at) then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists touch_task_updated_at on public.tasks;
create trigger touch_task_updated_at before update on public.tasks
  for each row execute function public.touch_task_updated_at();

-- shelved tasks get no reminders (task-reminders.sql's claim, plus «shelved_at is null»)
create or replace function public.claim_task_reminders(p_user_id uuid)
returns setof public.tasks language sql set search_path='' as $$
  update public.tasks t set reminder_claimed_at=now()
  where t.id in (
    select id from public.tasks where user_id=p_user_id and not done and shelved_at is null
      and reminder_at<=now() and reminder_sent_at is null
      and (reminder_claimed_at is null or reminder_claimed_at<now()-interval '5 minutes')
    order by reminder_at limit 50 for update skip locked
  ) returning t.*;
$$;
revoke all on function public.claim_task_reminders(uuid) from public,anon,authenticated;
grant execute on function public.claim_task_reminders(uuid) to service_role;
