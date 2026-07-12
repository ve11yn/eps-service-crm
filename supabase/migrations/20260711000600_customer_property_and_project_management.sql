-- Full customer/property relationship management and project/work-item administration.

alter table public.contacts
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists merged_into_contact_id uuid references public.contacts (id) on delete set null;

alter table public.properties
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create table if not exists public.property_contacts (
  property_id uuid not null references public.properties (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role_code text not null references public.contact_roles (code),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (property_id, contact_id, role_code)
);

create unique index if not exists property_contacts_one_primary_idx
  on public.property_contacts (property_id) where is_primary;

alter table public.project_items
  add column if not exists labour_cost numeric(12,2) not null default 0,
  add column if not exists material_cost numeric(12,2) not null default 0,
  add column if not exists checklist_requirements text,
  add column if not exists add_on_status text not null default 'not_applicable';

alter table public.project_items drop constraint if exists project_items_add_on_status_check;
alter table public.project_items add constraint project_items_add_on_status_check
  check (add_on_status in ('not_applicable','proposed','approved','rejected'));

create table if not exists public.project_item_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_item_id uuid not null references public.project_items (id) on delete cascade,
  event_type text not null,
  reason text,
  old_value jsonb,
  new_value jsonb,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_scope_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_item_id uuid references public.project_items (id) on delete set null,
  change_type text not null,
  status text not null default 'proposed',
  description text not null,
  amount_delta numeric(12,2) not null default 0,
  requested_by text,
  decided_at timestamptz,
  decided_by_profile_id uuid references public.profiles (id) on delete set null,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint project_scope_changes_status_check check (status in ('proposed','approved','rejected')),
  constraint project_scope_changes_type_check check (change_type in ('add_on','scope_change','rework','deferral'))
);

create table if not exists public.project_team_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_role text not null default 'worker',
  is_lead boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, profile_id)
);

create index if not exists project_item_events_item_idx on public.project_item_events(project_item_id,created_at desc);
create index if not exists project_scope_changes_project_idx on public.project_scope_changes(project_id,created_at desc);

do $$ declare table_name text; begin
  foreach table_name in array array['property_contacts','project_item_events','project_scope_changes','project_team_members'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I_owner_admin_select on public.%I for select to authenticated using (public.is_owner_or_admin())',table_name,table_name);
    execute format('create policy %I_owner_admin_insert on public.%I for insert to authenticated with check (public.is_owner_or_admin())',table_name,table_name);
    execute format('create policy %I_owner_admin_update on public.%I for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin())',table_name,table_name);
    execute format('create policy %I_owner_admin_delete on public.%I for delete to authenticated using (public.is_owner_or_admin())',table_name,table_name);
  end loop;
end $$;

create or replace function public.merge_contacts_atomic(p_source_id uuid,p_target_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
begin
  if p_source_id=p_target_id then raise exception 'Source and target must differ.'; end if;
  if not exists(select 1 from contacts where id=p_source_id and not is_archived) then raise exception 'Source contact not found.'; end if;
  if not exists(select 1 from contacts where id=p_target_id and not is_archived) then raise exception 'Target contact not found.'; end if;
  update whatsapp_threads set contact_id=p_target_id where contact_id=p_source_id;
  update leads set primary_contact_id=p_target_id where primary_contact_id=p_source_id;
  update projects set primary_contact_id=p_target_id where primary_contact_id=p_source_id;
  update review_drafts set contact_id=p_target_id where contact_id=p_source_id;
  insert into lead_contacts(lead_id,contact_id,role_code,is_primary,notes) select lead_id,p_target_id,role_code,is_primary,notes from lead_contacts where contact_id=p_source_id on conflict(lead_id,contact_id,role_code) do update set is_primary=excluded.is_primary,notes=coalesce(excluded.notes,lead_contacts.notes);
  delete from lead_contacts where contact_id=p_source_id;
  insert into project_contacts(project_id,contact_id,role_code,is_primary,notes) select project_id,p_target_id,role_code,is_primary,notes from project_contacts where contact_id=p_source_id on conflict(project_id,contact_id,role_code) do update set is_primary=excluded.is_primary,notes=coalesce(excluded.notes,project_contacts.notes);
  delete from project_contacts where contact_id=p_source_id;
  update property_contacts source set is_primary=false where source.contact_id=p_source_id and exists(select 1 from property_contacts existing where existing.property_id=source.property_id and existing.is_primary and existing.contact_id<>p_source_id);
  insert into property_contacts(property_id,contact_id,role_code,is_primary,notes) select property_id,p_target_id,role_code,is_primary,notes from property_contacts where contact_id=p_source_id on conflict(property_id,contact_id,role_code) do update set notes=coalesce(excluded.notes,property_contacts.notes),is_primary=property_contacts.is_primary or excluded.is_primary;
  delete from property_contacts where contact_id=p_source_id;
  update contacts set is_archived=true,archived_at=timezone('utc',now()),merged_into_contact_id=p_target_id where id=p_source_id;
  return p_target_id;
end; $$;
revoke all on function public.merge_contacts_atomic(uuid,uuid) from public;
grant execute on function public.merge_contacts_atomic(uuid,uuid) to service_role;
