-- «هوشاور › یه تمرین انگلیسی» (از ۲۰۲۶-۱۱-۱۴ جای «۱۰ دقیقه انگلیسی» رو گرفته):
-- «انجامش دادم» → «قبل از اینستا و یوتیوب انجامش دادی؟» → دقیقه و متن (اختیاری).
-- send-push (action "hooshavar-english", file hooshavar-english.ts, cron
-- `hooshavar-english-push` هر دقیقه) روزی یه بار سر ساعت تنظیم‌شده (پیش‌فرض ۱۶:۳۰)
-- اعلان می‌ده، مگه اینکه اون روز ثبت شده باشه. Client: hooshavar-english.js.
--
-- ✅ مایگریشن hooshavar_v4_one_english روی پروژهٔ Planner اجرا شده. این فایل فقط سند ساختاره.
--
-- حذف تمرین: hooshavar-english.js + خطش در index.html و sw.js و
-- tools/tailwind-build.html، import و خط action در send-push/index.ts + فایل
-- hooshavar-english.ts (و دوباره deploy)، بعد
--   select cron.unschedule('hooshavar-english-push');
--   drop table public.hooshavar_english_logs, public.hooshavar_english_prefs, public.hooshavar_english_sessions;

create table if not exists public.hooshavar_english_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day          date not null,                       -- 07:00 → 07:00, as لنگر صبح
  logged_at    timestamptz not null default now(),  -- «انجامش دادم» was tapped
  before_phone boolean,                             -- «آره، قبلش» = true, «نه، اول رفتم سراغ گوشی» = false, null = left unanswered
  minutes      smallint check (minutes is null or minutes between 1 and 120),
  note         text                                 -- «چی کار کردی؟»
);
create index if not exists hooshavar_english_logs_user_day_idx on public.hooshavar_english_logs (user_id, day);

create table if not exists public.hooshavar_english_prefs (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  notify_at  text not null default '16:30' check (notify_at ~ '^[0-2][0-9]:[0-5][0-9]$'), -- local time (Baghdad)
  pushed_day date                                   -- the exercise day the reminder was last sent (or found done)
);

alter table public.hooshavar_english_logs enable row level security;
create policy "owner hooshavar_english_logs" on public.hooshavar_english_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_english_logs to authenticated, service_role;
alter publication supabase_realtime add table public.hooshavar_english_logs;

alter table public.hooshavar_english_prefs enable row level security;
create policy "owner hooshavar_english_prefs" on public.hooshavar_english_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_english_prefs to authenticated, service_role;

-- «۱۰ دقیقه انگلیسی» (2026-11-05 → 11-13): kept as history, read-only from the app,
-- shown in the summary of the weeks it ran. Its timers are no longer closed by send-push.
create table if not exists public.hooshavar_english_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day         date not null,
  started_at  timestamptz not null default now(),
  extended_at timestamptz,
  ended_at    timestamptz,
  minutes     smallint check (minutes is null or minutes between 0 and 30),
  completed   boolean not null default false,
  decided     boolean not null default false,
  note        text,
  note_done   boolean not null default false
);
