create table if not exists public.app_settings (
  setting_key text primary key,
  category text not null,
  label text not null,
  description text,
  value jsonb not null default '{}'::jsonb,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.service_photo_requirements (
  service_key text primary key,
  service_label text not null,
  require_customer_photo boolean not null default false,
  require_before boolean not null default true,
  require_during boolean not null default false,
  require_after boolean not null default true,
  minimum_customer_photos integer not null default 0 check(minimum_customer_photos>=0),
  instructions text,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.notion_migration_runs (
  id uuid primary key default gen_random_uuid(),
  source_export_name text not null,
  status text not null default 'draft' check(status in ('draft','importing','validation','parallel_run','signed_off','cancelled')),
  mapping_config jsonb not null default '{}'::jsonb,
  validation_report jsonb not null default '{}'::jsonb,
  parallel_started_at timestamptz,
  parallel_ends_at timestamptz,
  notion_shutdown_approved_at timestamptz,
  notion_shutdown_approved_by_name text,
  signoff_notes text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.notion_migration_rows (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.notion_migration_runs(id) on delete cascade,
  entity_type text not null check(entity_type in ('customer','property','job','attachment')),
  source_row_number integer,
  source_id text,
  target_id uuid,
  duplicate_target_id uuid,
  status text not null check(status in ('imported','duplicate','linked','skipped','failed','pending')),
  source_data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.notion_migration_attachments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.notion_migration_runs(id) on delete cascade,
  target_entity_type text not null,
  target_entity_id uuid,
  original_file_name text not null,
  storage_bucket text not null default 'crm-private',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc',now())
);

create table if not exists public.notion_parity_checks (
  run_id uuid not null references public.notion_migration_runs(id) on delete cascade,
  check_code text not null,
  label text not null,
  is_complete boolean not null default false,
  notes text,
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  primary key(run_id,check_code)
);

create table if not exists public.user_acceptance_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.notion_migration_runs(id) on delete set null,
  scenario_code text not null,
  scenario_title text not null,
  outcome text not null check(outcome in ('pending','passed','failed','blocked')),
  tester_name text,
  notes text,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now())
);

insert into public.app_settings(setting_key,category,label,description,value) values
('invoice_defaults','finance','Invoice defaults','Default invoice numbering and notes','{"prefix":"INV","default_notes":"Thank you for your business."}'),
('payment_terms','finance','Payment terms','Default due period and payment instructions','{"days":14,"instructions":"Bank transfer"}'),
('reminder_rules','finance','Reminder rules','Days relative to invoice due date','{"before_due_days":[3],"after_due_days":[1,7,14]}'),
('quote_defaults','sales','Quote validity','Default quotation validity period','{"validity_days":14}'),
('tax_settings','finance','Tax settings','Default tax applied to invoices','{"enabled":false,"name":"GST","rate":0}'),
('company_details','branding','Company details','Legal and customer-facing company information','{"name":"Gage Handyman & Cleaning Service","email":"","phone":"","address":"","registration_number":""}'),
('branding','branding','Branding','Document and application brand settings','{"logo_url":"/eps-logo.png","primary_color":"#1f4b43","document_footer":""}')
on conflict(setting_key) do nothing;

insert into public.service_photo_requirements(service_key,service_label,require_customer_photo,require_before,require_after,instructions) values
('handyman','Handyman',true,true,true,'Capture the defect and surrounding area.'),
('electrical','Electrical',true,true,true,'Capture the fitting, switchboard or affected circuit area.'),
('plumbing','Plumbing',true,true,true,'Capture a close-up and wider context for leaks.'),
('cleaning','Cleaning',false,true,true,'Use matching before and after angles.'),
('assembly','Assembly',true,true,true,'Capture packaged parts and completed assembly.')
on conflict(service_key) do nothing;

create index if not exists notion_migration_rows_run_status_idx on public.notion_migration_rows(run_id,status);
create index if not exists notion_migration_attachments_run_idx on public.notion_migration_attachments(run_id);

do $$ declare table_name text; begin
 foreach table_name in array array['app_settings','service_photo_requirements','notion_migration_runs','notion_migration_rows','notion_migration_attachments','notion_parity_checks','user_acceptance_records'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('create policy %I_owner_admin_select on public.%I for select to authenticated using (public.is_owner_or_admin())',table_name,table_name);
  execute format('create policy %I_owner_admin_insert on public.%I for insert to authenticated with check (public.is_owner_or_admin())',table_name,table_name);
  execute format('create policy %I_owner_admin_update on public.%I for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin())',table_name,table_name);
  execute format('create policy %I_owner_admin_delete on public.%I for delete to authenticated using (public.is_owner_or_admin())',table_name,table_name);
 end loop;
end $$;
