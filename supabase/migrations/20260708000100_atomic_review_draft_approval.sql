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
  v_work_items := coalesce(p_extraction -> 'workItems', '[]'::jsonb);

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
        status_code = case when v_should_create_project then 'converted' else 'qualification' end
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
      case when v_should_create_project then 'converted' else 'qualification' end,
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
