-- «انگلیسی» — جدول عادت، جلسهٔ امروز، نسخهٔ حداقل، تکلیف‌های کنار گذاشته (۲۰۲۶-۱۱-۲۸)
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (english_habit).
--    این فایل فقط سند ساختاره؛ لازم نیست دوباره اجراش کنی.
--
-- The fixed weekly goal is replaced by a habit ladder: the day «شروع جدول عادت»
-- is tapped is day 1; weeks turn on Saturday; the daily goal climbs
-- 30 → 35 → 45 → 60 (weeks 4–6) as long as the week before had at least 4 done
-- days out of 6 (one chosen rest day a week). Practice is logged as sessions —
-- a timer or a manual entry — and a bad day can be rescued with a two-tick
-- minimum version. A day runs 07:00 → 07:00 (the `day` columns are that day).

-- the habit table's start, the rest day, and the answers to «برو بالا / همین بمونه»
alter table public.english_settings
  add column if not exists habit_start date,
  add column if not exists rest_day smallint not null default 5 check (rest_day between 0 and 6), -- JS getDay(); 5 = جمعه
  add column if not exists habit_steps jsonb not null default '{}'::jsonb; -- { "<Saturday YYYY-MM-DD>": "up" | "stay" }
-- weekly_goal_min stays in the table, unused since 2026-11-28.

-- «کنار بذار» on an overdue homework: off the list, kept as data
alter table public.english_homework add column if not exists shelved_at timestamptz;

-- english_practice is now the minimum version's two ticks. Old rows (the
-- 5-minute minimum) count as both ticked; the day is «انجام‌شده (حداقل)» only
-- when both are true.
alter table public.english_practice
  add column if not exists spoke boolean not null default true,    -- «۳۰ ثانیه انگلیسی حرف زدم»
  add column if not exists listened boolean not null default true; -- «۱۰ دقیقه انگلیسی گوش دادم»

-- one row per practice session: a timer (started_at + target_min; send-push
-- closes it when it runs out) or a manual entry (minutes only)
create table if not exists public.english_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day         date not null,                          -- the app day, 07:00 → 07:00
  source      text not null default 'timer' check (source in ('timer','manual')),
  started_at  timestamptz,                            -- timer only
  target_min  smallint check (target_min is null or target_min between 1 and 180),
  ended_at    timestamptz,                            -- null while a timer runs
  minutes     smallint check (minutes is null or minutes between 0 and 180),
  completed   boolean not null default false,         -- the timer ran out (not stopped)
  recalled    boolean not null default false,         -- «چیزی که امروز یاد گرفتم رو بلند به انگلیسی گفتم»
  created_at  timestamptz not null default now()
);
create index if not exists english_sessions_user_day_idx on public.english_sessions (user_id, day);
create index if not exists english_sessions_running_idx on public.english_sessions (ended_at) where ended_at is null;

-- «دیروز کجا گیر کرد؟» — the answer for a practice day with nothing logged.
-- A row with no reason = the question was closed without an answer (asked once).
create table if not exists public.english_misses (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,                           -- the day that was missed
  reason     text check (reason is null or reason in ('forgot','tired','time','unsure','other')),
  note       text,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.english_sessions enable row level security;
alter table public.english_misses enable row level security;
drop policy if exists "owner only" on public.english_sessions;
create policy "owner only" on public.english_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.english_misses;
create policy "owner only" on public.english_misses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- AIs only through madar-mcp (see mcp_security.sql)
drop policy if exists "ai only via mcp" on public.english_sessions;
create policy "ai only via mcp" on public.english_sessions as restrictive for all to authenticated
  using ((select private.request_ok())) with check ((select private.request_ok()));
drop policy if exists "ai only via mcp" on public.english_misses;
create policy "ai only via mcp" on public.english_misses as restrictive for all to authenticated
  using ((select private.request_ok())) with check ((select private.request_ok()));

revoke all on public.english_sessions, public.english_misses from anon;
grant select, insert, update, delete on public.english_sessions, public.english_misses to authenticated;
grant select, insert, update, delete on public.english_sessions, public.english_misses to service_role;

alter publication supabase_realtime add table public.english_sessions;
alter publication supabase_realtime add table public.english_misses;

-- backups: both join private.backup_tables() after english_practice
create or replace function private.backup_tables()
returns text[] language sql immutable as $$
  select array['tags','recurring_templates','tasks','subtasks','task_tags','task_date_changes',
    'tag_goals','recurring_template_tags','ideas','idea_tags','idea_images','ai_reports',
    'purchases','subscriptions','reminders','prompts','wins',
    'mother_care','mother_care_items',
    'home_repairs','home_repair_parts','home_maintenance',
    'english_settings','english_homework','english_chunks','english_practice',
    'english_sessions','english_misses'];
$$;

-- The timer's end: the every-minute `task-reminders` cron ({action:"tasks"})
-- also closes english_sessions whose time is up and sends «جلسه تموم شد.»
-- (send-push englishTimerRun). No cron of its own.
