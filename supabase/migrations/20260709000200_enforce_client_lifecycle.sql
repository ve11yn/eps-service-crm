-- Align the CRM lifecycle with the approved workflow:
-- Conversation -> Lead -> Quote -> Project -> Invoice.

alter table public.leads
  add column if not exists lead_summary text,
  add column if not exists decision_needed_summary text;

alter table public.quotes
  add column if not exists negotiation_summary text,
  add column if not exists approved_scope_summary text,
  add column if not exists decision_needed_summary text;

alter table public.projects
  add column if not exists worker_update_summary text,
  add column if not exists completion_summary text;

create table if not exists public.project_timeline_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_timeline_events_project_id_idx
  on public.project_timeline_events (project_id, created_at desc);

insert into public.lead_statuses (code, label, description, sort_order) values
  ('new_enquiry', 'New Enquiry', 'Initial customer contact via WhatsApp or web.', 1),
  ('qualification', 'Qualification', 'AI or admin is assessing whether the lead is ready for quote or site visit.', 2),
  ('site_visit', 'Site Visit', 'Physical inspection is required before a quote or job can be confirmed.', 3)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

update public.leads
set status_code = case
  when status_code = 'site_visit' then 'site_visit'
  when status_code = 'new_enquiry' then 'new_enquiry'
  else 'qualification'
end
where status_code not in ('new_enquiry', 'qualification', 'site_visit');

delete from public.lead_statuses
where code not in ('new_enquiry', 'qualification', 'site_visit');

insert into public.quote_statuses (code, label, description, sort_order) values
  ('draft', 'Draft', 'Quote prepared but not yet reviewed.', 1),
  ('sent', 'Sent', 'Quote delivered to the customer''s WhatsApp.', 2),
  ('negotiating', 'Negotiating', 'Customer requested changes or discounts.', 3),
  ('approved', 'Approved', 'Customer accepted the terms and pricing.', 4),
  ('revised', 'Revised', 'A new quote version has been created after scope changes.', 5),
  ('expired_rejected', 'Expired/Rejected', 'Quote was not accepted after inactivity or was explicitly declined.', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.project_statuses (code, label, description, sort_order) values
  ('scheduled', 'Scheduled', 'Job approved and assigned to a team or time slot.', 1),
  ('in_progress', 'In Progress', 'Workers are on-site and performing the task.', 2),
  ('qa_review', 'QA / Review', 'Work finished and awaiting admin or Gage sign-off.', 3),
  ('invoiced', 'Invoiced', 'Final invoice has been generated and sent.', 4),
  ('completed', 'Completed', 'Job finished and payment fully received.', 5)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

update public.projects
set status_code = 'scheduled'
where status_code not in ('scheduled', 'in_progress', 'qa_review', 'invoiced', 'completed');

delete from public.project_statuses
where code not in ('scheduled', 'in_progress', 'qa_review', 'invoiced', 'completed');

insert into public.invoice_statuses (code, label, description, sort_order) values
  ('draft', 'Draft', 'Invoice generated but not yet sent.', 1),
  ('issued', 'Issued', 'Invoice sent to the customer.', 2),
  ('partially_paid', 'Partially Paid', 'Deposit or partial payment received.', 3),
  ('paid', 'Paid', 'Full balance cleared.', 4),
  ('overdue', 'Overdue', 'Payment date has passed.', 5),
  ('cancelled', 'Cancelled', 'Invoice voided due to error or dispute.', 6)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.payment_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'No payment received yet.', 1),
  ('processing', 'Processing', 'Customer sent proof of transfer while waiting for bank reconciliation.', 2),
  ('paid', 'Paid', 'Funds confirmed in the account.', 3),
  ('refunded', 'Refunded', 'Funds returned to the customer.', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.work_item_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'Task assigned but not started.', 1),
  ('in_progress', 'In Progress', 'Worker is currently working on this item.', 2),
  ('completed', 'Completed', 'Task finished and photo evidence uploaded.', 3),
  ('deferred', 'Deferred', 'Task moved to a future date or removed from current scope.', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

update public.project_items
set status_code = 'deferred'
where status_code not in ('pending', 'in_progress', 'completed', 'deferred');

delete from public.work_item_statuses
where code not in ('pending', 'in_progress', 'completed', 'deferred');

alter table public.media_assets
  drop constraint if exists media_assets_evidence_type_check;

update public.media_assets
set evidence_type = case
  when evidence_type in ('customer_supplied', 'before', 'during', 'after', 'defect', 'materials', 'access', 'marked_up') then evidence_type
  when evidence_type in ('draft_work_item', 'project_work_item') then 'customer_supplied'
  else 'customer_supplied'
end
where evidence_type is not null;

alter table public.media_assets
  add constraint media_assets_evidence_type_check
  check (
    evidence_type is null
    or evidence_type in (
      'customer_supplied',
      'before',
      'during',
      'after',
      'defect',
      'materials',
      'access',
      'marked_up'
    )
  );

create or replace function public.enforce_project_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status_code <> 'scheduled' then
      raise exception 'Projects must start at Scheduled.';
    end if;
    return new;
  end if;

  if old.status_code = new.status_code then
    return new;
  end if;

  if not (
    (old.status_code = 'scheduled' and new.status_code = 'in_progress') or
    (old.status_code = 'in_progress' and new.status_code = 'qa_review') or
    (old.status_code = 'qa_review' and new.status_code = 'invoiced') or
    (old.status_code = 'invoiced' and new.status_code = 'completed')
  ) then
    raise exception 'Invalid project status transition: % -> %', old.status_code, new.status_code;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_status_transition_trigger on public.projects;
create trigger enforce_project_status_transition_trigger
before insert or update of status_code on public.projects
for each row execute function public.enforce_project_status_transition();

create or replace function public.approve_review_draft_atomic(
  p_review_draft_id uuid,
  p_reviewed_by_profile_id uuid,
  p_extraction jsonb,
  p_create_project boolean default null
)
returns table (
  review_draft_id uuid,
  contact_id uuid,
  property_id uuid,
  lead_id uuid,
  project_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.review_drafts%rowtype;
  v_contact_id uuid;
  v_property_id uuid;
  v_lead_id uuid;
  v_quote_id uuid;
  v_customer_name text;
  v_contact_phone text;
  v_alt_phone text;
  v_email text;
  v_property_name text;
  v_address_line1 text;
  v_unit_no text;
  v_postal_code text;
  v_access_notes text;
  v_title text;
  v_scope_summary text;
  v_remarks text;
  v_work_items jsonb;
  v_item jsonb;
  v_line_no integer := 1;
  v_now timestamptz := timezone('utc', now());
begin
  select *
  into v_draft
  from public.review_drafts
  where id = p_review_draft_id
  for update;

  if not found then
    raise exception 'Review draft not found.';
  end if;

  v_work_items := coalesce(p_extraction -> 'workItems', '[]'::jsonb);
  v_customer_name := nullif(trim(coalesce(p_extraction ->> 'customerName', '')), '');
  if v_customer_name is null then
    v_customer_name := nullif(trim(coalesce(p_extraction ->> 'contactPhone', '')), '');
  end if;
  if v_customer_name is null then
    v_customer_name := 'Unknown customer';
  end if;

  v_contact_phone := nullif(trim(coalesce(p_extraction ->> 'contactPhone', '')), '');
  v_alt_phone := nullif(trim(coalesce(p_extraction ->> 'alternatePhone', '')), '');
  v_email := nullif(trim(coalesce(p_extraction ->> 'email', '')), '');
  v_property_name := nullif(trim(coalesce(p_extraction ->> 'propertyName', '')), '');
  v_address_line1 := nullif(trim(coalesce(p_extraction ->> 'addressLine1', p_extraction ->> 'address', '')), '');
  v_unit_no := nullif(trim(coalesce(p_extraction ->> 'unitNumber', '')), '');
  v_postal_code := nullif(trim(coalesce(p_extraction ->> 'postalCode', '')), '');
  v_access_notes := nullif(trim(coalesce(p_extraction ->> 'accessNotes', '')), '');
  v_title := coalesce(
    nullif(trim(coalesce(p_extraction ->> 'leadTitle', '')), ''),
    nullif(trim(coalesce(p_extraction ->> 'projectTitle', '')), ''),
    nullif(trim(coalesce(p_extraction ->> 'issue', '')), ''),
    'WhatsApp enquiry'
  );
  v_scope_summary := nullif(trim(coalesce(p_extraction ->> 'scopeSummary', p_extraction ->> 'summary', '')), '');
  v_remarks := nullif(trim(coalesce(p_extraction ->> 'remarks', '')), '');

  if v_draft.contact_id is not null then
    update public.contacts
    set full_name = v_customer_name,
        whatsapp_number = v_contact_phone,
        primary_phone = coalesce(v_alt_phone, v_contact_phone),
        email = v_email,
        notes = v_remarks
    where id = v_draft.contact_id
    returning id into v_contact_id;
  else
    insert into public.contacts (
      full_name,
      whatsapp_number,
      primary_phone,
      email,
      notes
    ) values (
      v_customer_name,
      v_contact_phone,
      coalesce(v_alt_phone, v_contact_phone),
      v_email,
      v_remarks
    )
    returning id into v_contact_id;
  end if;

  if v_address_line1 is not null then
    if v_draft.property_id is not null then
      update public.properties
      set property_name = v_property_name,
          address_line_1 = v_address_line1,
          address_line_2 = null,
          unit_no = v_unit_no,
          postal_code = v_postal_code,
          access_notes = v_access_notes
      where id = v_draft.property_id
      returning id into v_property_id;
    else
      insert into public.properties (
        property_name,
        address_line_1,
        address_line_2,
        unit_no,
        postal_code,
        access_notes
      ) values (
        v_property_name,
        v_address_line1,
        null,
        v_unit_no,
        v_postal_code,
        v_access_notes
      )
      returning id into v_property_id;
    end if;
  end if;

  if v_draft.lead_id is not null then
    update public.leads
    set title = v_title,
        primary_contact_id = v_contact_id,
        primary_property_id = v_property_id,
        whatsapp_thread_id = v_draft.thread_id,
        summary = p_extraction ->> 'summary',
        lead_summary = p_extraction ->> 'summary',
        customer_request = coalesce(p_extraction ->> 'issue', p_extraction ->> 'summary'),
        ai_summary = p_extraction ->> 'summary',
        decision_needed_summary = case
          when coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false) then 'Site visit required before quote or job confirmation.'
          else null
        end,
        site_visit_required = coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false),
        qualification_notes = v_remarks,
        last_activity_at = v_now,
        status_code = case
          when coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false) then 'site_visit'
          else 'qualification'
        end
    where id = v_draft.lead_id
    returning id into v_lead_id;
  else
    insert into public.leads (
      lead_code,
      title,
      source_channel_code,
      status_code,
      primary_contact_id,
      primary_property_id,
      whatsapp_thread_id,
      summary,
      lead_summary,
      qualification_notes,
      ai_summary,
      decision_needed_summary,
      customer_request,
      site_visit_required,
      received_at,
      last_activity_at
    ) values (
      'LEAD-' || to_char(v_now, 'YYYYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      v_title,
      v_draft.source_channel_code,
      case
        when coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false) then 'site_visit'
        else 'qualification'
      end,
      v_contact_id,
      v_property_id,
      v_draft.thread_id,
      p_extraction ->> 'summary',
      p_extraction ->> 'summary',
      v_remarks,
      p_extraction ->> 'summary',
      case
        when coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false) then 'Site visit required before quote or job confirmation.'
        else null
      end,
      coalesce(p_extraction ->> 'issue', p_extraction ->> 'summary'),
      coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false),
      v_now,
      v_now
    )
    returning id into v_lead_id;
  end if;

  if jsonb_array_length(v_work_items) > 0 then
    insert into public.quotes (
      lead_id,
      quote_number,
      version_number,
      status_code,
      created_by_profile_id,
      notes,
      decision_needed_summary
    ) values (
      v_lead_id,
      'QUOTE-' || to_char(v_now, 'YYYYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      1,
      'draft',
      p_reviewed_by_profile_id,
      v_scope_summary,
      'Admin review required before sending quote to customer.'
    )
    returning id into v_quote_id;

    for v_item in select * from jsonb_array_elements(v_work_items) loop
      insert into public.quote_items (
        quote_id,
        line_no,
        title,
        description,
        quantity,
        unit_label,
        unit_price,
        total_price,
        notes
      ) values (
        v_quote_id,
        v_line_no,
        coalesce(nullif(trim(coalesce(v_item ->> 'title', '')), ''), 'Work item'),
        nullif(trim(coalesce(v_item ->> 'description', '')), ''),
        1,
        'item',
        0,
        0,
        nullif(trim(coalesce(v_item ->> 'actionSummary', '')), '')
      );

      v_line_no := v_line_no + 1;
    end loop;
  end if;

  update public.review_drafts
  set contact_id = v_contact_id,
      property_id = v_property_id,
      lead_id = v_lead_id,
      approved_project_id = null,
      extraction_payload = jsonb_set(p_extraction, '{shouldCreateProject}', 'false'::jsonb, true),
      status = 'converted_to_lead',
      reviewed_by_profile_id = p_reviewed_by_profile_id,
      reviewed_at = v_now,
      approved_at = v_now
  where id = v_draft.id;

  review_draft_id := v_draft.id;
  contact_id := v_contact_id;
  property_id := v_property_id;
  lead_id := v_lead_id;
  project_id := null;
  status := 'converted_to_lead';
  return next;
end;
$$;
