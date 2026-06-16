create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role_code text not null references public.user_roles (code),
  display_name text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  primary_phone text,
  whatsapp_number text,
  email citext,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  property_name text,
  address_line_1 text not null,
  address_line_2 text,
  unit_no text,
  postal_code text,
  country_code text not null default 'SG',
  access_notes text,
  landmark_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  source_channel_code text not null default 'whatsapp' references public.source_channels (code),
  external_thread_id text,
  thread_subject text,
  latest_ai_summary text,
  ai_last_summarized_at timestamptz,
  last_message_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.whatsapp_threads (id) on delete cascade,
  direction_code text not null references public.message_directions (code),
  message_type_code text not null references public.message_types (code),
  external_message_id text,
  sender_name text,
  sender_phone text,
  content text,
  media_caption text,
  provider_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text not null unique,
  title text,
  source_channel_code text not null default 'whatsapp' references public.source_channels (code),
  status_code text not null default 'new_enquiry' references public.lead_statuses (code),
  primary_contact_id uuid references public.contacts (id) on delete set null,
  primary_property_id uuid references public.properties (id) on delete set null,
  whatsapp_thread_id uuid references public.whatsapp_threads (id) on delete set null,
  assigned_to_profile_id uuid references public.profiles (id) on delete set null,
  summary text,
  qualification_notes text,
  ai_summary text,
  customer_request text,
  site_visit_required boolean not null default false,
  received_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_contacts (
  lead_id uuid not null references public.leads (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role_code text not null references public.contact_roles (code),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lead_id, contact_id, role_code)
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_labels (
  lead_id uuid not null references public.leads (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lead_id, label_id)
);

create unique index if not exists whatsapp_threads_external_thread_id_unique
  on public.whatsapp_threads (source_channel_code, external_thread_id)
  where external_thread_id is not null;

create unique index if not exists messages_external_message_id_unique
  on public.messages (thread_id, external_message_id)
  where external_message_id is not null;

create index if not exists messages_thread_id_idx
  on public.messages (thread_id, sent_at desc);

create index if not exists leads_status_code_idx
  on public.leads (status_code);

create index if not exists leads_primary_contact_id_idx
  on public.leads (primary_contact_id);

create index if not exists leads_whatsapp_thread_id_idx
  on public.leads (whatsapp_thread_id);

create index if not exists contacts_primary_phone_idx
  on public.contacts (primary_phone);

create index if not exists contacts_whatsapp_number_idx
  on public.contacts (whatsapp_number);

create index if not exists properties_postal_code_idx
  on public.properties (postal_code);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_contacts on public.contacts;
create trigger set_updated_at_contacts
before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_properties on public.properties;
create trigger set_updated_at_properties
before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_whatsapp_threads on public.whatsapp_threads;
create trigger set_updated_at_whatsapp_threads
before update on public.whatsapp_threads
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_labels on public.labels;
create trigger set_updated_at_labels
before update on public.labels
for each row execute function public.set_updated_at();

insert into public.labels (code, label, description, sort_order) values
  ('follow_up', 'Follow-up', 'Awaiting customer reply or next action', 1),
  ('agent_landlord', 'Agent/Landlord', 'Project involves agent or landlord reporting', 2),
  ('high_value', 'High Value', 'Project requires extra owner oversight', 3)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

