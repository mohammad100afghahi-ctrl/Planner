-- «هوشاور › تمرکز ۲۵ دقیقه»: one plan per date — «ساعت [ ]، در [ ]، [ ] رو
-- انجام می‌دم.» — written on the card for today or tomorrow. send-push
-- (action "hooshavar-focus", file hooshavar-focus.ts) rings at that time and
-- when 25 minutes are up. A session: «موبایل رو بردی یه اتاق دیگه؟» →
-- anxiety 0–10 → 25-minute timer → anxiety again → optional note.
-- Client: hooshavar-focus.js.
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (hooshavar_focus, hooshavar_v2) و cron
--    `hooshavar-focus-push` هر دقیقه اجرا می‌شه. این فایل فقط سند ساختاره.
--
-- حذف تمرین: hooshavar-focus.js + خطش در index.html و sw.js و
-- tools/tailwind-build.html، import و خط action در send-push/index.ts + فایل
-- hooshavar-focus.ts (و دوباره deploy)، بعد
--   select cron.unschedule('hooshavar-focus-push');
--   drop table public.hooshavar_focus_sessions, public.hooshavar_focus_plan;

create table if not exists public.hooshavar_focus_plan (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  weekday    smallint check (weekday between 0 and 6),  -- unused since v2 (plans were per weekday before)
  at_time    text not null check (at_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  place      text not null default '',
  task       text not null default '',
  pushed_on  date,                       -- written by send-push only: the start push went out
  primary key (user_id, day)
);

create table if not exists public.hooshavar_focus_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day            date not null,
  planned_time   text,                       -- the plan as it was when the session started (null = no plan that day)
  place          text not null default '',
  task           text not null default '',
  started_at     timestamptz not null default now(),
  delay_min      integer,                    -- started_at minus the planned time, in minutes (negative = early)
  ended_at       timestamptz,                -- null while the timer runs
  minutes        smallint check (minutes is null or minutes between 0 and 25),
  completed      boolean not null default false,
  anxiety_before smallint check (anxiety_before between 0 and 10),
  anxiety_after  smallint check (anxiety_after is null or anxiety_after between 0 and 10),
  note           text,                       -- «چی کمک کرد؟ چی مانع شد؟»
  after_done     boolean not null default false, -- the after-questions were answered
  end_pushed     boolean not null default false  -- send-push closed it at 25 minutes and sent «۲۵ دقیقه تموم شد.»
);
create index if not exists hooshavar_focus_sessions_user_day_idx on public.hooshavar_focus_sessions (user_id, day);

alter table public.hooshavar_focus_plan enable row level security;
alter table public.hooshavar_focus_sessions enable row level security;
create policy "owner hooshavar_focus_plan" on public.hooshavar_focus_plan for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner hooshavar_focus_sessions" on public.hooshavar_focus_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_focus_plan, public.hooshavar_focus_sessions to authenticated, service_role;
alter publication supabase_realtime add table public.hooshavar_focus_plan, public.hooshavar_focus_sessions;

-- every minute, reusing the protected english-push invocation (as task-reminders does)
do $$
declare cmd text;
begin
  if exists (select 1 from cron.job where jobname='hooshavar-focus-push') then return; end if;
  select command into cmd from cron.job where jobname='english-push' and active;
  if cmd is null or (length(cmd)-length(replace(cmd,'english','')))/7<>1 or cmd not like '%send-push%' then
    raise exception 'Existing push scheduler shape changed';
  end if;
  perform cron.schedule('hooshavar-focus-push','* * * * *',replace(cmd,'"english"','"hooshavar-focus"'));
end $$;
