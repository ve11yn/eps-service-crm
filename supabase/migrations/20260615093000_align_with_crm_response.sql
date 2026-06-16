insert into public.labels (code, label, description, sort_order) values
  ('waiting_for_customer', 'Waiting for Customer', 'Project or lead is blocked pending customer reply or confirmation', 4),
  ('waiting_for_payment', 'Waiting for Payment', 'Invoice has been sent and payment is still outstanding', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

alter table public.projects
  add column if not exists payment_follow_up_at timestamptz,
  add column if not exists payment_follow_up_note text;

alter table public.project_items
  add column if not exists before_after_required boolean not null default false;

comment on column public.projects.payment_follow_up_at is
  'Next planned payment follow-up date/time used for overdue invoice reminders and manual collection workflows.';

comment on column public.projects.payment_follow_up_note is
  'Free-text note for payment follow-up reminders, such as agreed callback date or collection note.';

comment on column public.project_items.before_after_required is
  'Whether the item requires before/after evidence uploads for QA or reporting.';

