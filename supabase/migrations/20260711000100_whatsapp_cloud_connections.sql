create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  waba_id text not null unique,
  phone_number_id text not null unique,
  business_id text,
  display_phone_number text,
  verified_name text,
  access_token_ciphertext text not null,
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'action_required', 'disconnected')),
  onboarding_type text not null default 'standard'
    check (onboarding_type in ('standard', 'coexistence', 'manual')),
  is_active boolean not null default true,
  subscribed_at timestamptz,
  registered_at timestamptz,
  contacts_sync_requested_at timestamptz,
  history_sync_requested_at timestamptz,
  last_error text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists whatsapp_connections_one_active_idx
  on public.whatsapp_connections (is_active)
  where is_active = true;

create index if not exists whatsapp_connections_phone_number_id_idx
  on public.whatsapp_connections (phone_number_id);

drop trigger if exists set_updated_at_whatsapp_connections
  on public.whatsapp_connections;
create trigger set_updated_at_whatsapp_connections
before update on public.whatsapp_connections
for each row execute function public.set_updated_at();

alter table public.whatsapp_connections enable row level security;
revoke all on table public.whatsapp_connections from anon, authenticated;

comment on table public.whatsapp_connections is
  'Server-only Meta WhatsApp Cloud API connections. Access tokens are AES-256-GCM encrypted by the application.';
