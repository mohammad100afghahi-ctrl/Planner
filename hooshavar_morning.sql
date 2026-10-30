-- «هوشاور › لنگر صبح»: the first time the app is opened each day (the day
-- starts at 07:00; 00:00–07:00 is still last night) it locks behind
-- «صبح بخیر. قبل از هر چیز این دو تا:» — two ticks, «ساعت چند بیدار شدی؟»
-- (optional), «قبل از این دو تا سراغ موبایل رفتی؟» — or «امروز نشد، رد می‌شم».
-- A day without a row is «باز نشد». Client: hooshavar-morning.js.
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (hooshavar_morning, hooshavar_v2).
--    این فایل فقط سند ساختاره؛ لازم نیست دوباره اجراش کنی.
--
-- حذف تمرین: hooshavar-morning.js + خطش در index.html و sw.js و
-- tools/tailwind-build.html، بعد
--   drop table public.hooshavar_morning;

create table if not exists public.hooshavar_morning (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,             -- the day it belongs to (07:00 → 07:00)
  opened_at  timestamptz not null,      -- first open of the day (was woke_at until v2)
  washed_at  timestamptz,               -- «صورتم رو شستم» ticked
  ate_at     timestamptz,               -- «یه چیزی خوردم» ticked
  woke_time  text check (woke_time is null or woke_time ~ '^[0-2][0-9]:[0-5][0-9]$'), -- «ساعت چند بیدار شدی؟», if given
  phone      text check (phone is null or phone in ('no','little','yes')), -- «قبل از این دو تا سراغ موبایل رفتی؟»
  skipped    boolean not null default false,  -- «امروز نشد، رد می‌شم»
  done_at    timestamptz,               -- finished (answered or skipped); null = the lock is still due
  primary key (user_id, day)
);

alter table public.hooshavar_morning enable row level security;
create policy "owner hooshavar_morning" on public.hooshavar_morning for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_morning to authenticated, service_role;
alter publication supabase_realtime add table public.hooshavar_morning;
