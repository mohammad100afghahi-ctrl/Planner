-- ============================================================
--  مدار — schema for push notifications (اعلان روی گوشی)
--
--  ✅ این مایگریشن روی پروژهٔ Planner اجرا شده (create_push_subscriptions).
--     این فایل فقط سند ساختاره؛ لازم نیست دوباره اجراش کنی.
--
--  Each row is one device/browser that said yes to notifications. The
--  send-push edge function reads them with service_role every morning and
--  deletes the ones the push service reports as gone (404/410).
-- ============================================================

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint     text not null unique,   -- the push service URL for this device
  p256dh       text not null,          -- device public key (payload encryption)
  auth         text not null,          -- device auth secret
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "owner only" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

-- The VAPID key pair lives in private.cron_secrets (names 'vapid_public' and
-- 'vapid_private'). send-push generates it itself on first run and stores it
-- through init_vapid_keys (migration push_vapid_self_init), so the private key
-- never leaves the database/function. Only service_role can read it.
create or replace function public.get_vapid_keys()
returns table (public_key text, private_key text)
language sql security definer set search_path = '' as $$
  select (select value from private.cron_secrets where name = 'vapid_public'),
         (select value from private.cron_secrets where name = 'vapid_private');
$$;
revoke execute on function public.get_vapid_keys() from public, anon, authenticated;
grant execute on function public.get_vapid_keys() to service_role;

-- Morning digest at 08:00 Asia/Baghdad (05:00 UTC). Same auth shape as the AI
-- report cron: anon key for verify_jwt, x-cron-secret for the real check.
select cron.schedule('daily-push-digest', '0 5 * * *', $cron$
  select net.http_post(
    url := 'https://byqowlvyupcusjjyxwaf.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cW93bHZ5dXBjdXNqanl4d2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzAwMDUsImV4cCI6MjEwMzQwNjAwNX0.T2miyC7NU5u0bkyxA4JKtXML9RSiqeTzk-OAqvx59QM',
      'x-cron-secret', (select value from private.cron_secrets where name = 'ai_report')
    ),
    body := '{"action":"digest"}'::jsonb
  );
$cron$);

create or replace function public.init_vapid_keys(pub text, priv text)
returns table (public_key text, private_key text)
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.cron_secrets (name, value) values ('vapid_public', pub), ('vapid_private', priv)
    on conflict (name) do nothing;
  return query select * from public.get_vapid_keys();
end $$;
revoke execute on function public.init_vapid_keys(text, text) from public, anon, authenticated;
grant execute on function public.init_vapid_keys(text, text) to service_role;
