-- «انگلیسی»: classes with a teacher (Top Notch) and the homework that wasn't
-- getting done. After each class the homework is written down in one line;
-- the english-plan edge function cuts it into 10–15 minute chunks spread over
-- the days until the next class, and each day's chunks show on امروز.
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (english_homework).
--    این فایل فقط سند ساختاره؛ لازم نیست دوباره اجراش کنی.
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge functions, realtime on.

-- one row per account: when the classes are, and when to nudge
create table if not exists public.english_settings (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  class_days    smallint[] not null default '{}',     -- JS getDay(): 0 = یکشنبه … 6 = شنبه
  class_time    text not null default '18:00' check (class_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  class_times   jsonb not null default '{}'::jsonb,   -- { "<getDay()>": 'HH:MM' } — a day's own start time; without one, class_time
  class_minutes smallint not null default 90 check (class_minutes between 15 and 300),
  practice_time text not null default '20:00' check (practice_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  push          boolean not null default true,
  pushed        jsonb not null default '{}'::jsonb,   -- { after, practice, eve: 'YYYY-MM-DD' } — written by send-push only
  updated_at    timestamptz not null default now()
);

create table if not exists public.english_homework (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,                  -- the homework in the user's own words
  unit        text not null default '',
  assigned_on date not null,                  -- the class it was given in
  due_on      date not null,                  -- the next class
  created_at  timestamptz not null default now()
);
create index if not exists english_homework_user_id_idx on public.english_homework (user_id);

-- a homework is done when all its chunks are; there is no status column
create table if not exists public.english_chunks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  homework_id uuid not null references public.english_homework(id) on delete cascade,
  title       text not null,
  minutes     smallint not null default 10 check (minutes between 1 and 120),
  day         date not null,                  -- the day it sits on امروز
  position    smallint not null default 0,
  done        boolean not null default false,
  done_at     timestamptz,
  actual_min  smallint check (actual_min is null or actual_min between 1 and 600),  -- asked when it's ticked; counts toward the «انگلیسی» weekly goal
  difficulty  text check (difficulty is null or difficulty in ('easy','medium','hard')),
  skips       jsonb not null default '[]'::jsonb,  -- [{ day, reason: time|hard|forgot|mood }] — «چرا نشد؟»
  created_at  timestamptz not null default now()
);
create index if not exists english_chunks_user_id_idx on public.english_chunks (user_id);
create index if not exists english_chunks_homework_id_idx on public.english_chunks (homework_id);

-- days the 5-minute minimum was ticked (a done chunk counts for the chain too)
create table if not exists public.english_practice (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.english_settings enable row level security;
alter table public.english_homework enable row level security;
alter table public.english_chunks enable row level security;
alter table public.english_practice enable row level security;

drop policy if exists "owner only" on public.english_settings;
create policy "owner only" on public.english_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.english_homework;
create policy "owner only" on public.english_homework for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.english_chunks;
create policy "owner only" on public.english_chunks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.english_practice;
create policy "owner only" on public.english_practice for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.english_settings, public.english_homework, public.english_chunks, public.english_practice from anon;
grant select, insert, update, delete on public.english_settings, public.english_homework, public.english_chunks, public.english_practice to authenticated;
grant select, insert, update, delete on public.english_settings, public.english_homework, public.english_chunks, public.english_practice to service_role;

alter publication supabase_realtime add table public.english_settings;
alter publication supabase_realtime add table public.english_homework;
alter publication supabase_realtime add table public.english_chunks;
alter publication supabase_realtime add table public.english_practice;

-- backups: all four join private.backup_tables() (see backups.sql)

-- The timed nudges (after class, daily practice time, the night before a
-- class) can't ride the 08:00 digest, so send-push is also called every 10
-- minutes with {"action":"english"} and sends whatever has just come due.
-- Same auth shape as daily-push-digest (see push.sql): the anon key for
-- verify_jwt, x-cron-secret for the real check.
--   select cron.schedule('english-push', '*/10 * * * *', $cron$ … body := '{"action":"english"}'::jsonb … $cron$);
