-- Operational invoice lines and finance metadata.

alter table public.invoices
  add column if not exists tax_rate numeric(7, 4) not null default 0,
  add column if not exists payment_terms_days integer not null default 14,
  add column if not exists customer_notes text;

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  project_item_id uuid references public.project_items (id) on delete set null,
  line_no integer not null default 1,
  title text not null,
  description text,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_label text,
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoice_items_invoice_id_idx
  on public.invoice_items (invoice_id, line_no);

alter table public.invoice_items enable row level security;

drop policy if exists invoice_items_owner_admin_select on public.invoice_items;
create policy invoice_items_owner_admin_select on public.invoice_items
for select to authenticated using (public.is_owner_or_admin());

drop policy if exists invoice_items_owner_admin_insert on public.invoice_items;
create policy invoice_items_owner_admin_insert on public.invoice_items
for insert to authenticated with check (public.is_owner_or_admin());

drop policy if exists invoice_items_owner_admin_update on public.invoice_items;
create policy invoice_items_owner_admin_update on public.invoice_items
for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

drop policy if exists invoice_items_owner_admin_delete on public.invoice_items;
create policy invoice_items_owner_admin_delete on public.invoice_items
for delete to authenticated using (public.is_owner_or_admin());

create or replace function public.save_invoice_draft_atomic(
  p_invoice_id uuid,
  p_due_at timestamptz,
  p_tax_rate numeric,
  p_payment_terms_days integer,
  p_notes text,
  p_customer_notes text,
  p_items jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_keep_ids uuid[] := array[]::uuid[];
  v_quantity numeric(12,2);
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2);
begin
  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if v_invoice.status_code <> 'draft' then raise exception 'Only draft invoices can be edited.'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'Invoice needs at least one item.'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := greatest(coalesce(nullif(v_item ->> 'quantity', '')::numeric, 0), 0);
    v_unit_price := greatest(coalesce(nullif(v_item ->> 'unitPrice', '')::numeric, 0), 0);
    if v_quantity <= 0 then raise exception 'Invoice item quantity must be greater than zero.'; end if;
    if nullif(v_item ->> 'id', '') is not null then
      v_item_id := (v_item ->> 'id')::uuid;
      update public.invoice_items set
        line_no = coalesce(nullif(v_item ->> 'lineNo', '')::integer, 1),
        title = coalesce(nullif(trim(v_item ->> 'title'), ''), 'Service item'),
        description = nullif(trim(coalesce(v_item ->> 'description', '')), ''),
        quantity = v_quantity, unit_label = coalesce(nullif(v_item ->> 'unitLabel', ''), 'item'),
        unit_price = v_unit_price, total_price = round(v_quantity * v_unit_price, 2),
        notes = nullif(trim(coalesce(v_item ->> 'notes', '')), ''), updated_at = timezone('utc', now())
      where id = v_item_id and invoice_id = p_invoice_id;
      if not found then raise exception 'Invoice item mismatch.'; end if;
    else
      insert into public.invoice_items (invoice_id, line_no, title, description, quantity, unit_label, unit_price, total_price, notes)
      values (p_invoice_id, coalesce(nullif(v_item ->> 'lineNo', '')::integer, 1), coalesce(nullif(trim(v_item ->> 'title'), ''), 'Service item'), nullif(v_item ->> 'description', ''), v_quantity, coalesce(nullif(v_item ->> 'unitLabel', ''), 'item'), v_unit_price, round(v_quantity*v_unit_price,2), nullif(v_item ->> 'notes',''))
      returning id into v_item_id;
    end if;
    v_keep_ids := array_append(v_keep_ids, v_item_id);
    v_subtotal := v_subtotal + round(v_quantity * v_unit_price, 2);
  end loop;
  delete from public.invoice_items where invoice_id = p_invoice_id and not (id = any(v_keep_ids));
  v_tax := round(v_subtotal * greatest(coalesce(p_tax_rate, 0), 0) / 100, 2);
  update public.invoices set subtotal_amount=v_subtotal, tax_rate=greatest(coalesce(p_tax_rate,0),0), tax_amount=v_tax,
    total_amount=v_subtotal+v_tax, balance_due_amount=v_subtotal+v_tax, due_at=p_due_at,
    payment_terms_days=greatest(coalesce(p_payment_terms_days,14),0), notes=nullif(trim(coalesce(p_notes,'')),''),
    customer_notes=nullif(trim(coalesce(p_customer_notes,'')),''), updated_at=timezone('utc',now())
  where id=p_invoice_id returning * into v_invoice;
  return v_invoice;
end;
$$;

revoke all on function public.save_invoice_draft_atomic(uuid,timestamptz,numeric,integer,text,text,jsonb) from public;
grant execute on function public.save_invoice_draft_atomic(uuid,timestamptz,numeric,integer,text,text,jsonb) to service_role;
