-- «هوشاور › لنگر صبح»: the first time the app is opened each day (the day
-- starts at 05:00) it locks behind two ticks — «صورتم رو شستم» and «یه چیزی
-- خوردم». woke_at is that first open; done_at is when both were ticked.
-- Client: hooshavar-morning.js.
--
-- ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (hooshavar_morning).
--    این فایل فقط سند ساختاره؛ لازم نیست دوباره اجراش کنی.
--
-- حذف تمرین: hooshavar-morning.js + خطش در index.html و sw.js، بعد
--   drop table public.hooshavar_morning;

create table if not exists public.hooshavar_morning (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,             -- the day it belongs to (an open before 05:00 is the day before)
  woke_at    timestamptz not null,      -- first open of the day
  washed_at  timestamptz,               -- «صورتم رو شستم»
  ate_at     timestamptz,               -- «یه چیزی خوردم»
  done_at    timestamptz,               -- both ticked
  primary key (user_id, day)
);

alter table public.hooshavar_morning enable row level security;
create policy "owner hooshavar_morning" on public.hooshavar_morning for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.hooshavar_morning to authenticated;
grant select, insert, update, delete on public.hooshavar_morning to service_role;
alter publication supabase_realtime add table public.hooshavar_morning;
