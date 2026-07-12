-- QA, customer sign-off, closeout controls, and stable workbook import keys.

alter table public.projects
  add column if not exists qa_status text not null default 'pending',
  add column if not exists qa_reviewed_at timestamptz,
  add column if not exists qa_reviewed_by_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists qa_notes text,
  add column if not exists customer_signoff_status text not null default 'pending',
  add column if not exists customer_signed_at timestamptz,
  add column if not exists customer_signed_by_name text,
  add column if not exists warranty_starts_at timestamptz,
  add column if not exists review_request_generated_at timestamptz;

alter table public.projects drop constraint if exists projects_qa_status_check;
alter table public.projects add constraint projects_qa_status_check
  check (qa_status in ('pending', 'approved', 'rework_required'));
alter table public.projects drop constraint if exists projects_customer_signoff_check;
alter table public.projects add constraint projects_customer_signoff_check
  check (customer_signoff_status in ('pending', 'approved', 'declined'));

create unique index if not exists pricing_items_catalog_source_row_unique
  on public.pricing_items (catalog_id, source_row_number)
  where source_row_number is not null;

create or replace function public.enforce_project_status_transition()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status_code <> 'scheduled' then raise exception 'Projects must start at Scheduled.'; end if;
    return new;
  end if;
  if old.status_code = new.status_code then return new; end if;
  if not (
    (old.status_code = 'scheduled' and new.status_code = 'in_progress') or
    (old.status_code = 'in_progress' and new.status_code = 'qa_review') or
    (old.status_code = 'qa_review' and new.status_code = 'in_progress') or
    (old.status_code = 'qa_review' and new.status_code = 'invoiced') or
    (old.status_code = 'invoiced' and new.status_code = 'completed')
  ) then raise exception 'Invalid project status transition: % -> %', old.status_code, new.status_code; end if;
  return new;
end;
$$;
