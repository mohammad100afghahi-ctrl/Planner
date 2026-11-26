-- ============================================================
--  مدار — schema for «یادآوری‌ها» (reminders)
--
--  ✅ این مایگریشن روی پروژهٔ Planner اجرا شده و جدول ساخته شده.
--     این فایل فقط سند ساختار جدوله؛ لازم نیست دوباره اجراش کنی.
--     نام مایگریشن‌ها در Supabase: create_reminders و fix_subscriptions_anon_grants
-- ============================================================

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  -- once: یک روز مشخص | yearly: هر سال همون روزِ شمسی
  -- deadline: تا این تاریخ فرصت داری | always: بدون تاریخ، همیشه بالای صفحه
  kind        text not null default 'once'
              check (kind in ('once','yearly','deadline','always')),
  date        date,                          -- null فقط برای kind = 'always'
  lead_days   integer not null default 0,    -- از چند روز قبل نشون داده بشه
  note        text,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint reminders_date_required_unless_always
    check (kind = 'always' or date is not null)
);

-- صفحهٔ «امروز» فقط یادآوری‌های باز رو می‌خونه
create index reminders_open_idx on public.reminders (date) where not done;

-- اپ فقط با کلید anon کار می‌کنه، پس هم policy لازمه هم grant —
-- نبودِ همین grant بود که جدول subscriptions رو غیرقابل‌خوندن کرده بود
alter table public.reminders enable row level security;

create policy "allow all reminders" on public.reminders
  for all using (true) with check (true);

grant select, insert, update, delete on public.reminders to anon, authenticated;

-- همگام‌سازی زنده بین دستگاه‌ها
alter publication supabase_realtime add table public.reminders;


-- ------------------------------------------------------------
--  رفع باگ موجود: نقش anon جدول subscriptions رو داشت ولی grant نداشت،
--  برای همین هر بار لود اپ با خطای 42501 می‌خورد و بنر قرمز میومد بالا.
-- ------------------------------------------------------------

grant select, insert, update, delete on public.subscriptions to anon, authenticated;

alter publication supabase_realtime add table public.subscriptions;
