alter table public.project_items
  add column if not exists is_pi boolean not null default false,
  add column if not exists is_checklist_item boolean not null default false,
  add column if not exists item_group text,
  add column if not exists item_type text;

alter table public.projects
  add column if not exists payment_follow_up_at timestamptz,
  add column if not exists payment_follow_up_note text;