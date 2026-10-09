-- Free-text description for a task (the «توضیحات» box under the title in the task editor).
-- Recurring templates carry it too, so each generated instance starts with the same notes.
-- Applied 2026-09-24. Existing table grants/RLS already cover new columns.
alter table public.tasks add column if not exists notes text;
alter table public.recurring_templates add column if not exists notes text;
