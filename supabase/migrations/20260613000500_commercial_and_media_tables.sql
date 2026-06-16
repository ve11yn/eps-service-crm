create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  quote_number text not null,
  version_number integer not null default 1,
  status_code text not null default 'draft' references public.quote_statuses (code),
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  currency_code text not null default 'SGD',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  sent_at timestamptz,
  approved_at timestamptz,
  expired_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quotes_parent_check
    check (num_nonnulls(lead_id, project_id) >= 1),
  constraint quotes_number_version_unique
    unique (quote_number, version_number)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  source_project_item_id uuid references public.project_items (id) on delete set null,
  line_no integer not null default 1,
  title text not null,
  description text,
  quantity numeric(12, 2) not null default 1,
  unit_label text,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_number text not null unique,
  status_code text not null default 'draft' references public.invoice_statuses (code),
  quickbooks_sync_id text unique,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  currency_code text not null default 'SGD',
  subtotal_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  balance_due_amount numeric(12, 2) not null default 0,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  status_code text not null default 'pending' references public.payment_statuses (code),
  verified_by_profile_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency_code text not null default 'SGD',
  payment_method text,
  reference_number text,
  proof_reference text,
  reported_at timestamptz,
  verified_at timestamptz,
  refunded_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_item_id uuid references public.project_items (id) on delete set null,
  purchased_by_profile_id uuid references public.profiles (id) on delete set null,
  status_code text not null default 'planned' references public.purchase_statuses (code),
  supplier_name text,
  item_name text not null,
  description text,
  quantity numeric(12, 2) not null default 1,
  unit_cost numeric(12, 2) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  receipt_number text,
  purchase_date date,
  customer_billable boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  purchase_id uuid references public.purchases (id) on delete set null,
  project_item_id uuid references public.project_items (id) on delete set null,
  document_type_code text not null references public.document_types (code),
  file_name text not null,
  storage_bucket text,
  storage_path text,
  external_url text,
  mime_type text,
  file_size_bytes bigint,
  is_customer_visible boolean not null default false,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  project_item_id uuid references public.project_items (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  storage_bucket text not null default 'crm-media',
  storage_path text not null,
  public_url text,
  mime_type text,
  media_type text,
  evidence_type text,
  caption text,
  captured_at timestamptz,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  thread_id uuid references public.whatsapp_threads (id) on delete set null,
  triggered_by_profile_id uuid references public.profiles (id) on delete set null,
  status_code text not null default 'queued' references public.ai_run_statuses (code),
  run_type text not null,
  model_name text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists quotes_lead_id_idx
  on public.quotes (lead_id);

create index if not exists quotes_project_id_idx
  on public.quotes (project_id);

create index if not exists quote_items_quote_id_idx
  on public.quote_items (quote_id, line_no);

create index if not exists invoices_project_id_idx
  on public.invoices (project_id, issued_at);

create index if not exists payments_project_id_idx
  on public.payments (project_id, reported_at);

create index if not exists payments_invoice_id_idx
  on public.payments (invoice_id);

create index if not exists purchases_project_id_idx
  on public.purchases (project_id, purchase_date);

create index if not exists purchases_project_item_id_idx
  on public.purchases (project_item_id);

create index if not exists documents_project_id_idx
  on public.documents (project_id);

create index if not exists documents_quote_id_idx
  on public.documents (quote_id);

create index if not exists documents_invoice_id_idx
  on public.documents (invoice_id);

create index if not exists media_assets_project_id_idx
  on public.media_assets (project_id);

create index if not exists media_assets_project_item_id_idx
  on public.media_assets (project_item_id);

create index if not exists ai_runs_thread_id_idx
  on public.ai_runs (thread_id, created_at desc);

drop trigger if exists set_updated_at_quotes on public.quotes;
create trigger set_updated_at_quotes
before update on public.quotes
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_quote_items on public.quote_items;
create trigger set_updated_at_quote_items
before update on public.quote_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_invoices on public.invoices;
create trigger set_updated_at_invoices
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_payments on public.payments;
create trigger set_updated_at_payments
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_purchases on public.purchases;
create trigger set_updated_at_purchases
before update on public.purchases
for each row execute function public.set_updated_at();

