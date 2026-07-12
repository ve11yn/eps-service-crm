alter table public.appointments
  add column if not exists cancellation_reason text,
  add column if not exists reschedule_reason text,
  add column if not exists customer_confirmation_status text not null default 'pending',
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists worker_confirmation_status text not null default 'pending',
  add column if not exists worker_confirmed_at timestamptz;

alter table public.appointments drop constraint if exists appointments_customer_confirmation_check;
alter table public.appointments add constraint appointments_customer_confirmation_check
  check (customer_confirmation_status in ('pending', 'confirmed', 'declined'));

alter table public.appointments drop constraint if exists appointments_worker_confirmation_check;
alter table public.appointments add constraint appointments_worker_confirmation_check
  check (worker_confirmation_status in ('pending', 'confirmed', 'declined'));

create index if not exists appointments_worker_schedule_idx
  on public.appointments (assigned_profile_id, scheduled_start_at, scheduled_end_at)
  where status_code in ('scheduled', 'confirmed');

alter table public.quotes
  add column if not exists valid_until timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_by_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists delivery_method text,
  add column if not exists delivery_reference text,
  add column if not exists delivery_notes text;

alter table public.quotes drop constraint if exists quotes_delivery_method_check;
alter table public.quotes add constraint quotes_delivery_method_check
  check (delivery_method is null or delivery_method in ('manual', 'email', 'whatsapp', 'other'));

alter table public.quote_items
  add column if not exists pricing_match_status text not null default 'manual',
  add column if not exists pricing_match_confidence numeric(5, 4),
  add column if not exists pricing_match_method text,
  add column if not exists pricing_match_notes text;

alter table public.quote_items drop constraint if exists quote_items_pricing_match_status_check;
alter table public.quote_items add constraint quote_items_pricing_match_status_check
  check (pricing_match_status in ('matched', 'needs_review', 'manual'));

alter table public.quote_items drop constraint if exists quote_items_pricing_match_confidence_check;
alter table public.quote_items add constraint quote_items_pricing_match_confidence_check
  check (pricing_match_confidence is null or (pricing_match_confidence >= 0 and pricing_match_confidence <= 1));

create table if not exists public.second_brain_summaries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead', 'quote', 'project')),
  entity_id uuid not null,
  summary_type text not null check (summary_type in ('lead', 'negotiation', 'approved_scope', 'decision_needed', 'worker_update', 'completion')),
  content text not null,
  source_type text not null default 'ai' check (source_type in ('ai', 'human', 'system')),
  model_name text,
  is_locked boolean not null default false,
  is_current boolean not null default true,
  supersedes_id uuid references public.second_brain_summaries (id) on delete set null,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists second_brain_one_current_summary_idx
  on public.second_brain_summaries (entity_type, entity_id, summary_type)
  where is_current;

create index if not exists second_brain_summary_history_idx
  on public.second_brain_summaries (entity_type, entity_id, summary_type, created_at desc);

alter table public.second_brain_summaries enable row level security;

drop policy if exists second_brain_authenticated_read on public.second_brain_summaries;
create policy second_brain_authenticated_read on public.second_brain_summaries
  for select to authenticated using (true);
