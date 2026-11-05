-- «هوشاور › ۱۰ دقیقه انگلیسی» (جای «تمرکز ۲۵ دقیقه» رو گرفته): after لنگر صبح a
-- card offers a 10-minute timer → «ادامه می‌دم» (20 more, can be stopped) or
-- «همین کافیه» → optional «امروز چی کار کردی؟». send-push (action
-- "hooshavar-english", file hooshavar-english.ts) closes the timers and rings.
-- Client: hooshavar-english.js.
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (hooshavar_v3_charge_and_english) و
--    cron `hooshavar-english-push` هر دقیقه اجرا می‌شه. این فایل فقط سند ساختاره.
--
-- حذف تمرین: hooshavar-english.js + خطش در index.html و sw.js و
-- tools/tailwind-build.html، import و خط action در send-push/index.ts + فایل
-- hooshavar-english.ts (و دوباره deploy)، بعد
--   select cron.unschedule('hooshavar-english-push');
--   drop table public.hooshavar_english_sessions;
--
-- جدول‌های تمرین قبلی (خالی‌ان و دیگه استفاده نمی‌شن):
--   drop table public.hooshavar_focus_sessions, public.hooshavar_focus_plan;

create table if not exists public.hooshavar_english_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day         date not null,                     -- 07:00 → 07:00, as لنگر صبح
  started_at  timestamptz not null default now(),
  extended_at timestamptz,                       -- «ادامه می‌دم» was tapped; the 20 minutes run from here
  ended_at    timestamptz,                       -- null while a timer runs
  minutes     smallint check (minutes is null or minutes between 0 and 30), -- minutes actually done
  completed   boolean not null default false,    -- the first 10 minutes ran out; false = «ناقص»
  decided     boolean not null default false,    -- nothing left to ask about continuing
  note        text,                              -- «امروز چی کار کردی؟»
  note_done   boolean not null default false     -- the note was written or passed
);
create index if not exists hooshavar_english_sessions_user_day_idx on public.hooshavar_english_sessions (user_id, day);

alter table public.hooshavar_english_sessions enable row level security;
create policy "owner hooshavar_english_sessions" on public.hooshavar_english_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_english_sessions to authenticated, service_role;
alter publication supabase_realtime add table public.hooshavar_english_sessions;
