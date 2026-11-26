-- public.prompts — the prompt collection on the پرامپت‌ها page.
--
-- Same four steps as every table this anon-key-only app talks to. Miss the
-- GRANT and every write fails with 42501 while the optimistic UI still shows
-- the row as saved.

create table if not exists public.prompts (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,
  category   text,
  note       text,
  favorite   boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1. RLS on.
alter table public.prompts enable row level security;

-- 2. Policy: single-user app, so anon may do everything.
drop policy if exists "allow all prompts" on public.prompts;
create policy "allow all prompts" on public.prompts
  for all using (true) with check (true);

-- 3. Table grant — the step that is easy to forget and fails silently.
grant select, insert, update, delete on public.prompts to anon, authenticated;

-- 4. Realtime, so a change on one device reaches the others.
alter publication supabase_realtime add table public.prompts;
