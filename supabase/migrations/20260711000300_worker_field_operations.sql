-- Structured worker updates and issue alerts for the non-WhatsApp worker workflow.

create table if not exists public.project_field_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_item_id uuid references public.project_items (id) on delete cascade,
  worker_profile_id uuid not null references public.profiles (id) on delete restrict,
  update_type text not null,
  issue_type text,
  notes text,
  requires_attention boolean not null default false,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles (id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint project_field_updates_type_check
    check (update_type in ('on_the_way', 'arrived', 'in_progress', 'completed', 'issue')),
  constraint project_field_updates_issue_check
    check (
      (update_type = 'issue' and issue_type in ('customer_not_home', 'need_parts', 'safety_concern', 'scope_question', 'other'))
      or (update_type <> 'issue' and issue_type is null)
    )
);

create index if not exists project_field_updates_project_id_idx
  on public.project_field_updates (project_id, created_at desc);

create index if not exists project_field_updates_item_id_idx
  on public.project_field_updates (project_item_id, created_at desc);

create index if not exists project_field_updates_attention_idx
  on public.project_field_updates (requires_attention, resolved_at, created_at desc);

alter table public.project_field_updates enable row level security;

drop policy if exists project_field_updates_owner_admin_select on public.project_field_updates;
create policy project_field_updates_owner_admin_select
on public.project_field_updates
for select to authenticated
using (public.is_owner_or_admin());

drop policy if exists project_field_updates_owner_admin_update on public.project_field_updates;
create policy project_field_updates_owner_admin_update
on public.project_field_updates
for update to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());
