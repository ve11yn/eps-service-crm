insert into public.lead_statuses (code, label, description, sort_order) values
  ('new_enquiry', 'New Enquiry', 'Initial customer contact via WhatsApp or web.', 1),
  ('qualification', 'Qualification', 'AI or admin is assessing whether the lead is ready for a quote.', 2),
  ('site_visit', 'Site Visit', 'Physical inspection is required before an accurate quote can be given.', 3),
  ('quote_draft', 'Quote Draft', 'AI has prepared a draft based on the service catalog.', 4),
  ('awaiting_approval', 'Awaiting Approval', 'Quote has been sent to the customer via WhatsApp.', 5),
  ('converted', 'Converted', 'Lead has been turned into a project/job.', 6),
  ('lost', 'Lost', 'Lead was rejected, expired, or not pursued.', 7)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.project_statuses (code, label, description, sort_order) values
  ('scheduled', 'Scheduled', 'Job approved and assigned to a team or time slot.', 1),
  ('in_progress', 'In Progress', 'Workers are on-site and performing the task.', 2),
  ('qa_review', 'QA / Review', 'Work finished and awaiting admin or Gage sign-off.', 3),
  ('invoiced', 'Invoiced', 'Final invoice has been generated and sent.', 4),
  ('completed', 'Completed', 'Job finished and payment fully received.', 5),
  ('on_hold', 'On Hold', 'Job is paused while waiting for customer reply, parts, or an internal decision.', 6),
  ('cancelled', 'Cancelled', 'Job is aborted or no longer proceeding.', 7)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

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
    sort_order = excluded.sort_order;

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
    sort_order = excluded.sort_order;

insert into public.payment_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'No payment received yet.', 1),
  ('processing', 'Processing', 'Customer sent proof of transfer while waiting for bank reconciliation.', 2),
  ('paid', 'Paid', 'Funds confirmed in the account.', 3),
  ('refunded', 'Refunded', 'Funds returned to the customer.', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.work_item_statuses (code, label, description, sort_order) values
  ('pending', 'Pending', 'Task assigned but not started.', 1),
  ('in_progress', 'In Progress', 'Worker is currently working on this item.', 2),
  ('completed', 'Completed', 'Task finished and photo evidence uploaded.', 3),
  ('deferred', 'Deferred', 'Task moved to a future date or removed from current scope.', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.labels (code, label, description, sort_order) values
  ('urgent', 'Urgent', 'Time-sensitive job requiring same-day response or dispatch.', 1),
  ('follow_up', 'Follow-up', 'Awaiting customer reply or part arrival.', 2),
  ('agent_landlord', 'Agent/Landlord', 'B2B or recurring property management lead requiring specific reporting.', 3),
  ('high_value', 'High Value', 'Job above the internal threshold requiring Gage''s personal oversight.', 4)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

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
  v_project_id uuid;
  v_should_create_project boolean;
  v_lead_status text;
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
  v_media jsonb;
  v_item_id uuid;
  v_sort_order integer := 0;
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

  v_should_create_project :=
    coalesce(
      p_create_project,
      coalesce(nullif(p_extraction ->> 'shouldCreateProject', '')::boolean, false)
    );

  v_work_items := coalesce(p_extraction -> 'workItems', '[]'::jsonb);
  v_lead_status := case
    when v_should_create_project then 'converted'
    when coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false) then 'site_visit'
    when jsonb_array_length(v_work_items) > 0 then 'quote_draft'
    else 'qualification'
  end;

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
        customer_request = coalesce(p_extraction ->> 'issue', p_extraction ->> 'summary'),
        ai_summary = p_extraction ->> 'summary',
        site_visit_required = coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false),
        qualification_notes = v_remarks,
        last_activity_at = v_now,
        status_code = v_lead_status
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
      qualification_notes,
      ai_summary,
      customer_request,
      site_visit_required,
      received_at,
      last_activity_at
    ) values (
      'LEAD-' || to_char(v_now, 'YYYYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      v_title,
      v_draft.source_channel_code,
      v_lead_status,
      v_contact_id,
      v_property_id,
      v_draft.thread_id,
      p_extraction ->> 'summary',
      v_remarks,
      p_extraction ->> 'summary',
      coalesce(p_extraction ->> 'issue', p_extraction ->> 'summary'),
      coalesce(nullif(p_extraction ->> 'siteVisitRequired', '')::boolean, false),
      v_now,
      v_now
    )
    returning id into v_lead_id;
  end if;

  if v_should_create_project then
    if v_draft.approved_project_id is not null then
      update public.projects
      set title = coalesce(nullif(trim(coalesce(p_extraction ->> 'projectTitle', '')), ''), v_title),
          source_lead_id = v_lead_id,
          source_channel_code = v_draft.source_channel_code,
          status_code = 'scheduled',
          primary_contact_id = v_contact_id,
          primary_property_id = v_property_id,
          whatsapp_thread_id = v_draft.thread_id,
          scope_summary = v_scope_summary,
          remarks = v_remarks,
          enquiry_at = v_now,
          scheduled_start_at = null,
          payment_due_at = null,
          warranty_expires_at = null
      where id = v_draft.approved_project_id
      returning id into v_project_id;
    else
      insert into public.projects (
        project_code,
        title,
        source_lead_id,
        source_channel_code,
        status_code,
        primary_contact_id,
        primary_property_id,
        whatsapp_thread_id,
        scope_summary,
        remarks,
        enquiry_at,
        scheduled_start_at,
        payment_due_at,
        warranty_expires_at
      ) values (
        'PROJ-' || to_char(v_now, 'YYYYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
        coalesce(nullif(trim(coalesce(p_extraction ->> 'projectTitle', '')), ''), v_title),
        v_lead_id,
        v_draft.source_channel_code,
        'scheduled',
        v_contact_id,
        v_property_id,
        v_draft.thread_id,
        v_scope_summary,
        v_remarks,
        v_now,
        null,
        null,
        null
      )
      returning id into v_project_id;
    end if;

    if v_draft.approved_project_id is null and jsonb_array_length(v_work_items) > 0 then
      for v_item in select * from jsonb_array_elements(v_work_items) loop
        insert into public.project_items (
          project_id,
          title,
          description,
          area_name,
          action_summary,
          priority_code,
          item_group,
          item_type,
          is_add_on,
          is_pi,
          is_checklist_item,
          sort_order,
          status_code
        ) values (
          v_project_id,
          coalesce(nullif(trim(coalesce(v_item ->> 'title', '')), ''), 'Work item'),
          nullif(trim(coalesce(v_item ->> 'description', '')), ''),
          nullif(trim(coalesce(v_item ->> 'areaName', '')), ''),
          nullif(trim(coalesce(v_item ->> 'actionSummary', '')), ''),
          case
            when lower(coalesce(v_item ->> 'priority', '')) = 'urgent' then 'urgent'
            when lower(coalesce(v_item ->> 'priority', '')) = 'high' then 'high'
            else 'normal'
          end,
          nullif(trim(coalesce(v_item ->> 'itemGroup', '')), ''),
          nullif(trim(coalesce(v_item ->> 'itemType', '')), ''),
          coalesce((v_item ->> 'isAddOn')::boolean, false),
          coalesce((v_item ->> 'isPi')::boolean, false),
          coalesce((v_item ->> 'isChecklistItem')::boolean, false),
          v_sort_order,
          'pending'
        )
        returning id into v_item_id;

        for v_media in select * from jsonb_array_elements(coalesce(v_item -> 'mediaAssets', '[]'::jsonb)) loop
          update public.media_assets
          set project_id = v_project_id,
              project_item_id = v_item_id,
              evidence_type = 'project_work_item'
          where id = (v_media ->> 'id')::uuid;
        end loop;

        v_sort_order := v_sort_order + 1;
      end loop;
    end if;
  end if;

  update public.review_drafts
  set contact_id = v_contact_id,
      property_id = v_property_id,
      lead_id = v_lead_id,
      approved_project_id = v_project_id,
      extraction_payload = p_extraction,
      status = case when v_should_create_project then 'converted_to_project' else 'converted_to_lead' end,
      reviewed_by_profile_id = p_reviewed_by_profile_id,
      reviewed_at = v_now,
      approved_at = v_now
  where id = v_draft.id;

  review_draft_id := v_draft.id;
  contact_id := v_contact_id;
  property_id := v_property_id;
  lead_id := v_lead_id;
  project_id := v_project_id;
  status := case when v_should_create_project then 'converted_to_project' else 'converted_to_lead' end;
  return next;
end;
$$;
