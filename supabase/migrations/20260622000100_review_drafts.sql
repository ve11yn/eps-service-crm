create table if not exists public.review_drafts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.whatsapp_threads (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  approved_project_id uuid references public.projects (id) on delete set null,
  source_channel_code text not null default 'whatsapp' references public.source_channels (code),
  status text not null default 'needs_review' check (
    status in (
      'new',
      'ai_processed',
      'needs_review',
      'approved',
      'rejected',
      'converted_to_lead',
      'converted_to_project'
    )
  ),
  raw_conversation jsonb not null default '[]'::jsonb,
  extraction_payload jsonb not null default '{}'::jsonb,
  pricing_suggestions_payload jsonb not null default '[]'::jsonb,
  review_notes text,
  reviewed_by_profile_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_drafts_thread_id_idx
  on public.review_drafts (thread_id);

create index if not exists review_drafts_lead_id_idx
  on public.review_drafts (lead_id);

create index if not exists review_drafts_status_idx
  on public.review_drafts (status);

create index if not exists review_drafts_created_at_idx
  on public.review_drafts (created_at desc);

drop trigger if exists set_updated_at_review_drafts on public.review_drafts;
create trigger set_updated_at_review_drafts
before update on public.review_drafts
for each row execute function public.set_updated_at();
