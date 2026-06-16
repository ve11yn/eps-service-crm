create table if not exists public.user_roles (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_channels (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quote_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoice_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_item_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_types (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.priority_levels (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_roles (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_types (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_types (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_directions (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_run_statuses (
  code text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.user_roles (code, label, description, sort_order) values
  ('owner', 'Owner', 'Full business ownership access', 1),
  ('admin', 'Admin', 'Operational administration access', 2),
  ('coordinator', 'Coordinator', 'Schedules work and manages communication', 3),
  ('field_worker', 'Field Worker', 'Handles assigned field work only', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.source_channels (code, label, description, sort_order) values
  ('whatsapp', 'WhatsApp', 'Inbound or outbound WhatsApp conversation', 1),
  ('web', 'Web', 'Website or web form lead', 2),
  ('phone', 'Phone', 'Voice call lead', 3),
  ('manual', 'Manual', 'Manually created by staff', 4),
  ('referral', 'Referral', 'Referred by existing customer or partner', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.lead_statuses (code, label, description, sort_order) values
  ('new_enquiry', 'New Enquiry', 'Initial inbound lead before qualification', 1),
  ('qualification', 'Qualification', 'Lead is being assessed and clarified', 2),
  ('site_visit', 'Site Visit', 'Physical inspection is required before quoting', 3),
  ('quote_draft', 'Quote Draft', 'Quote is being prepared before customer delivery', 4),
  ('awaiting_approval', 'Awaiting Approval', 'Quote has been sent and is pending customer decision', 5),
  ('converted', 'Converted', 'Lead has been turned into a project', 6),
  ('lost', 'Lost', 'Lead was rejected, expired, or not pursued', 7)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.project_statuses (code, label, description, sort_order) values
  ('scheduled', 'Scheduled', 'Project has been approved and booked', 1),
  ('in_progress', 'In Progress', 'Work has started on site', 2),
  ('qa_review', 'QA / Review', 'Awaiting internal sign-off after worker completion', 3),
  ('invoiced', 'Invoiced', 'Final invoice has been sent', 4),
  ('completed', 'Completed', 'Operationally complete and fully paid', 5),
  ('on_hold', 'On Hold', 'Project is paused awaiting decision or dependency', 6),
  ('cancelled', 'Cancelled', 'Project is not proceeding', 7)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.quote_statuses (code, label, description, sort_order) values
  ('draft', 'Draft', 'Quote prepared but not yet sent', 1),
  ('sent', 'Sent', 'Quote sent to customer', 2),
  ('negotiating', 'Negotiating', 'Customer is asking for changes or discounts', 3),
  ('approved', 'Approved', 'Customer accepted the quote', 4),
  ('revised', 'Revised', 'A new version of the quote exists', 5),
  ('expired_rejected', 'Expired/Rejected', 'Quote lapsed or was explicitly declined', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.invoice_statuses (code, label, description, sort_order) values
  ('draft', 'Draft', 'Invoice generated but not yet sent', 1),
  ('issued', 'Issued', 'Invoice has been sent to customer', 2),
  ('partially_paid', 'Partially Paid', 'Deposit or partial amount has been received', 3),
  ('paid', 'Paid', 'Full invoice balance has been settled', 4),
  ('overdue', 'Overdue', 'Due date has passed without full payment', 5),
  ('cancelled', 'Cancelled', 'Invoice was voided or replaced', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.payment_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'No payment received yet', 1),
  ('processing', 'Processing', 'Customer provided proof but settlement is not yet verified', 2),
  ('paid', 'Paid', 'Funds are confirmed', 3),
  ('refunded', 'Refunded', 'Funds were returned to customer', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.work_item_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'Task is assigned but not started', 1),
  ('in_progress', 'In Progress', 'Worker is currently working on the item', 2),
  ('completed', 'Completed', 'Task is finished with evidence uploaded', 3),
  ('deferred', 'Deferred', 'Task moved to a later date or removed from current scope', 4),
  ('cancelled', 'Cancelled', 'Task is no longer required', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.appointment_types (code, label, description, sort_order) values
  ('site_visit', 'Site Visit', 'Inspection before quote or repair planning', 1),
  ('work_execution', 'Work Execution', 'Main scheduled work session', 2),
  ('handover', 'Handover', 'Final handover to customer', 3),
  ('curtain_pickup', 'Curtain Pickup', 'Pickup appointment for curtain service', 4),
  ('curtain_return', 'Curtain Return', 'Return appointment for curtain service', 5),
  ('revisit', 'Revisit', 'Follow-up visit after the main work', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.appointment_statuses (code, label, description, sort_order) values
  ('scheduled', 'Scheduled', 'Appointment is booked', 1),
  ('confirmed', 'Confirmed', 'Appointment is confirmed with customer', 2),
  ('completed', 'Completed', 'Appointment happened successfully', 3),
  ('cancelled', 'Cancelled', 'Appointment was cancelled', 4),
  ('no_show', 'No Show', 'Appointment failed because one side did not attend', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.priority_levels (code, label, description, sort_order) values
  ('normal', 'Normal', 'Standard operational priority', 1),
  ('high', 'High', 'Needs faster action than normal', 2),
  ('urgent', 'Urgent', 'Requires immediate action or same-day response', 3)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.contact_roles (code, label, description, sort_order) values
  ('owner', 'Owner', 'Property owner or direct client', 1),
  ('tenant', 'Tenant', 'Occupant or tenant contact', 2),
  ('agent', 'Agent', 'Property agent or representative', 3),
  ('landlord', 'Landlord', 'Landlord contact', 4),
  ('other', 'Other', 'Any other project-related contact role', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.document_types (code, label, description, sort_order) values
  ('quotation', 'Quotation', 'Customer-facing quote PDF or file', 1),
  ('invoice', 'Invoice', 'Customer invoice document', 2),
  ('payment_proof', 'Payment Proof', 'Transfer proof or payment evidence', 3),
  ('purchase_receipt', 'Purchase Receipt', 'Supplier receipt for internal purchase', 4),
  ('warranty', 'Warranty', 'Warranty or aftercare documentation', 5),
  ('other', 'Other', 'Any other document type', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.message_types (code, label, description, sort_order) values
  ('text', 'Text', 'Plain text message', 1),
  ('image', 'Image', 'Image message', 2),
  ('video', 'Video', 'Video message', 3),
  ('audio', 'Audio', 'Audio or voice note', 4),
  ('document', 'Document', 'Document or attachment', 5),
  ('location', 'Location', 'Shared location or map pin', 6),
  ('system', 'System', 'System-generated message', 7)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.message_directions (code, label, description, sort_order) values
  ('inbound', 'Inbound', 'Received from customer or external sender', 1),
  ('outbound', 'Outbound', 'Sent by staff or automation', 2),
  ('system', 'System', 'Recorded by internal automation', 3)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.purchase_statuses (code, label, description, sort_order) values
  ('planned', 'Planned', 'Purchase identified but not completed', 1),
  ('purchased', 'Purchased', 'Item bought and receipt captured', 2),
  ('reimbursed', 'Reimbursed', 'Internal reimbursement completed', 3),
  ('cancelled', 'Cancelled', 'Purchase no longer required', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.ai_run_statuses (code, label, description, sort_order) values
  ('queued', 'Queued', 'Waiting to be processed', 1),
  ('processing', 'Processing', 'AI task is running', 2),
  ('completed', 'Completed', 'AI task completed successfully', 3),
  ('failed', 'Failed', 'AI task errored', 4),
  ('needs_review', 'Needs Review', 'Output requires human review before use', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

