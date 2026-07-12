-- Make quotes editable, traceable, catalogue-backed, and safely versioned.

alter table public.quotes
  add column if not exists revision_of_quote_id uuid references public.quotes (id) on delete set null;

create index if not exists quotes_revision_of_quote_id_idx
  on public.quotes (revision_of_quote_id);

alter table public.quote_items
  add column if not exists pricing_item_id uuid references public.pricing_items (id) on delete set null,
  add column if not exists decision_status text not null default 'proposed',
  add column if not exists decision_notes text;

alter table public.quote_items
  drop constraint if exists quote_items_decision_status_check;

alter table public.quote_items
  add constraint quote_items_decision_status_check
  check (decision_status in ('proposed', 'approved', 'rejected', 'deferred'));

create index if not exists quote_items_pricing_item_id_idx
  on public.quote_items (pricing_item_id);

create index if not exists quote_items_decision_status_idx
  on public.quote_items (quote_id, decision_status);

create or replace function public.save_quote_draft_atomic(
  p_quote_id uuid,
  p_notes text,
  p_discount_amount numeric,
  p_items jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_keep_ids uuid[] := array[]::uuid[];
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := greatest(coalesce(p_discount_amount, 0), 0);
  v_quantity numeric(12, 2);
  v_unit_price numeric(12, 2);
  v_total numeric(12, 2);
  v_decision text;
begin
  select * into v_quote
  from public.quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Quote not found.';
  end if;

  if v_quote.status_code <> 'draft' then
    raise exception 'Only draft quotes can be edited. Create a revision first.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'A quote must contain at least one item.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := greatest(coalesce(nullif(v_item ->> 'quantity', '')::numeric, 0), 0);
    v_unit_price := greatest(coalesce(nullif(v_item ->> 'unitPrice', '')::numeric, 0), 0);
    v_total := round(v_quantity * v_unit_price, 2);
    v_decision := coalesce(nullif(v_item ->> 'decisionStatus', ''), 'proposed');

    if v_quantity <= 0 then
      raise exception 'Quote item quantity must be greater than zero.';
    end if;

    if v_decision not in ('proposed', 'approved', 'rejected', 'deferred') then
      raise exception 'Invalid quote item decision status: %', v_decision;
    end if;

    if nullif(v_item ->> 'id', '') is not null then
      v_item_id := (v_item ->> 'id')::uuid;

      update public.quote_items
      set line_no = coalesce(nullif(v_item ->> 'lineNo', '')::integer, 1),
          title = coalesce(nullif(trim(v_item ->> 'title'), ''), 'Work item'),
          description = nullif(trim(coalesce(v_item ->> 'description', '')), ''),
          quantity = v_quantity,
          unit_label = coalesce(nullif(trim(v_item ->> 'unitLabel'), ''), 'item'),
          unit_price = v_unit_price,
          total_price = v_total,
          notes = nullif(trim(coalesce(v_item ->> 'notes', '')), ''),
          pricing_item_id = nullif(v_item ->> 'pricingItemId', '')::uuid,
          decision_status = v_decision,
          decision_notes = nullif(trim(coalesce(v_item ->> 'decisionNotes', '')), ''),
          updated_at = timezone('utc', now())
      where id = v_item_id and quote_id = p_quote_id;

      if not found then
        raise exception 'Quote item does not belong to this quote.';
      end if;
    else
      insert into public.quote_items (
        quote_id,
        line_no,
        title,
        description,
        quantity,
        unit_label,
        unit_price,
        total_price,
        notes,
        pricing_item_id,
        decision_status,
        decision_notes
      ) values (
        p_quote_id,
        coalesce(nullif(v_item ->> 'lineNo', '')::integer, 1),
        coalesce(nullif(trim(v_item ->> 'title'), ''), 'Work item'),
        nullif(trim(coalesce(v_item ->> 'description', '')), ''),
        v_quantity,
        coalesce(nullif(trim(v_item ->> 'unitLabel'), ''), 'item'),
        v_unit_price,
        v_total,
        nullif(trim(coalesce(v_item ->> 'notes', '')), ''),
        nullif(v_item ->> 'pricingItemId', '')::uuid,
        v_decision,
        nullif(trim(coalesce(v_item ->> 'decisionNotes', '')), '')
      ) returning id into v_item_id;
    end if;

    v_keep_ids := array_append(v_keep_ids, v_item_id);
    if v_decision in ('proposed', 'approved') then
      v_subtotal := v_subtotal + v_total;
    end if;
  end loop;

  delete from public.quote_items
  where quote_id = p_quote_id
    and not (id = any(v_keep_ids));

  v_discount := least(v_discount, v_subtotal);

  update public.quotes
  set notes = nullif(trim(coalesce(p_notes, '')), ''),
      subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount = greatest(v_subtotal - v_discount, 0),
      updated_at = timezone('utc', now())
  where id = p_quote_id
  returning * into v_quote;

  return v_quote;
end;
$$;

revoke all on function public.save_quote_draft_atomic(uuid, text, numeric, jsonb) from public;
grant execute on function public.save_quote_draft_atomic(uuid, text, numeric, jsonb) to service_role;
