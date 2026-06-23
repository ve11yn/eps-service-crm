create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  title text not null,
  source_lead_id uuid references public.leads (id) on delete set null,
  source_channel_code text not null default 'whatsapp' references public.source_channels (code),
  status_code text not null default 'scheduled' references public.project_statuses (code),
  primary_contact_id uuid references public.contacts (id) on delete set null,
  primary_property_id uuid references public.properties (id) on delete set null,
  whatsapp_thread_id uuid references public.whatsapp_threads (id) on delete set null,
  coordinator_profile_id uuid references public.profiles (id) on delete set null,
  scope_summary text,
  remarks text,
  enquiry_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  handover_at timestamptz,
  payment_due_at timestamptz,
  warranty_expires_at timestamptz,
  completed_at timestamptz,
  quickbooks_customer_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_contacts (
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role_code text not null references public.contact_roles (code),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, contact_id, role_code)
);

create table if not exists public.project_labels (
  project_id uuid not null references public.projects (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, label_id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  appointment_type_code text not null references public.appointment_types (code),
  status_code text not null default 'scheduled' references public.appointment_statuses (code),
  assigned_profile_id uuid references public.profiles (id) on delete set null,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointments_one_parent_check
    check (num_nonnulls(lead_id, project_id) = 1)
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  status_code text not null default 'pending' references public.work_item_statuses (code),
  priority_code text not null default 'normal' references public.priority_levels (code),
  assigned_profile_id uuid references public.profiles (id) on delete set null,
  sort_order integer not null default 0,
  title text not null,
  description text,
  area_name text,
  action_summary text,
  customer_note text,
  internal_note text,
  quoted_amount numeric(12, 2) not null default 0,
  actual_cost numeric(12, 2) not null default 0,
  scheduled_start_at timestamptz,
  scheduled_due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  is_add_on boolean not null default false,
  is_deferred boolean not null default false,
  deferred_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  is_pi boolean not null default false,
  is_checklist_item boolean not null default false,
  item_group text,
  item_type text
);

create index if not exists projects_status_code_idx
  on public.projects (status_code);

create index if not exists projects_primary_contact_id_idx
  on public.projects (primary_contact_id);

create index if not exists projects_primary_property_id_idx
  on public.projects (primary_property_id);

create index if not exists projects_whatsapp_thread_id_idx
  on public.projects (whatsapp_thread_id);

create index if not exists appointments_lead_id_idx
  on public.appointments (lead_id, scheduled_start_at);

create index if not exists appointments_project_id_idx
  on public.appointments (project_id, scheduled_start_at);

create index if not exists project_items_project_id_idx
  on public.project_items (project_id, sort_order);

create index if not exists project_items_status_code_idx
  on public.project_items (status_code);

drop trigger if exists set_updated_at_projects on public.projects;
create trigger set_updated_at_projects
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_appointments on public.appointments;
create trigger set_updated_at_appointments
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_items on public.project_items;
create trigger set_updated_at_project_items
before update on public.project_items
for each row execute function public.set_updated_at();

