create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  performed_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_error_logs (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  severity text not null default 'error',
  error_name text,
  message text not null,
  stack text,
  details jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists system_error_logs_created_at_idx
  on public.system_error_logs (created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role text := coalesce(new.raw_user_meta_data ->> 'role_code', 'field_worker');
  default_name text := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'User'), '@', 1)
  );
begin
  insert into public.profiles (id, role_code, display_name, phone)
  values (
    new.id,
    case
      when default_role in ('owner', 'admin', 'coordinator', 'field_worker')
        then default_role
      else 'field_worker'
    end,
    coalesce(nullif(default_name, ''), 'User'),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role_code
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin'), false);
$$;

alter table public.profiles enable row level security;
alter table public.review_drafts enable row level security;
alter table public.pricing_catalogs enable row level security;
alter table public.pricing_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_error_logs enable row level security;

do $$
declare
  table_name text;
  app_tables text[] := array[
    'contacts',
    'properties',
    'whatsapp_threads',
    'messages',
    'leads',
    'lead_contacts',
    'labels',
    'lead_labels',
    'projects',
    'project_contacts',
    'project_labels',
    'appointments',
    'project_items',
    'quotes',
    'quote_items',
    'invoices',
    'payments',
    'purchases',
    'documents',
    'media_assets',
    'ai_runs'
  ];
begin
  foreach table_name in array app_tables
  loop
    execute format('drop policy if exists %I_select_authenticated on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_authenticated on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_authenticated on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_authenticated on public.%I', table_name, table_name);

    execute format('drop policy if exists %I_owner_admin_select on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_admin_insert on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_admin_update on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_admin_delete on public.%I', table_name, table_name);

    execute format(
      'create policy %I_owner_admin_select on public.%I for select to authenticated using (public.is_owner_or_admin())',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_owner_admin_insert on public.%I for insert to authenticated with check (public.is_owner_or_admin())',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_owner_admin_update on public.%I for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin())',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_owner_admin_delete on public.%I for delete to authenticated using (public.is_owner_or_admin())',
      table_name,
      table_name
    );
  end loop;
end
$$;

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_authenticated on public.profiles;
drop policy if exists profiles_update_authenticated on public.profiles;
drop policy if exists profiles_delete_authenticated on public.profiles;
drop policy if exists profiles_owner_admin_select on public.profiles;
drop policy if exists profiles_owner_admin_update on public.profiles;
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;

create policy profiles_owner_admin_select
on public.profiles
for select
to authenticated
using (public.is_owner_or_admin());

create policy profiles_owner_admin_update
on public.profiles
for update
to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());

create policy profiles_self_select
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_self_update
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists review_drafts_owner_admin_select on public.review_drafts;
drop policy if exists review_drafts_owner_admin_insert on public.review_drafts;
drop policy if exists review_drafts_owner_admin_update on public.review_drafts;
drop policy if exists review_drafts_owner_admin_delete on public.review_drafts;

create policy review_drafts_owner_admin_select
on public.review_drafts
for select
to authenticated
using (public.is_owner_or_admin());

create policy review_drafts_owner_admin_insert
on public.review_drafts
for insert
to authenticated
with check (public.is_owner_or_admin());

create policy review_drafts_owner_admin_update
on public.review_drafts
for update
to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());

create policy review_drafts_owner_admin_delete
on public.review_drafts
for delete
to authenticated
using (public.is_owner_or_admin());

drop policy if exists pricing_catalogs_authenticated_select on public.pricing_catalogs;
drop policy if exists pricing_items_authenticated_select on public.pricing_items;
drop policy if exists pricing_catalogs_owner_admin_select on public.pricing_catalogs;
drop policy if exists pricing_items_owner_admin_select on public.pricing_items;

create policy pricing_catalogs_owner_admin_select
on public.pricing_catalogs
for select
to authenticated
using (public.is_owner_or_admin());

create policy pricing_items_owner_admin_select
on public.pricing_items
for select
to authenticated
using (public.is_owner_or_admin());

drop policy if exists audit_logs_owner_admin_select on public.audit_logs;
drop policy if exists audit_logs_owner_admin_insert on public.audit_logs;

create policy audit_logs_owner_admin_select
on public.audit_logs
for select
to authenticated
using (public.is_owner_or_admin());

create policy audit_logs_owner_admin_insert
on public.audit_logs
for insert
to authenticated
with check (public.is_owner_or_admin());

drop policy if exists system_error_logs_owner_admin_select on public.system_error_logs;
drop policy if exists system_error_logs_owner_admin_insert on public.system_error_logs;

create policy system_error_logs_owner_admin_select
on public.system_error_logs
for select
to authenticated
using (public.is_owner_or_admin());

create policy system_error_logs_owner_admin_insert
on public.system_error_logs
for insert
to authenticated
with check (public.is_owner_or_admin());
