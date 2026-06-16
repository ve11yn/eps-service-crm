insert into storage.buckets (id, name, public)
values
  ('crm-documents', 'crm-documents', false),
  ('crm-media', 'crm-media', false),
  ('crm-private', 'crm-private', false)
on conflict (id) do nothing;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  table_name text;
  app_tables text[] := array[
    'profiles',
    'contacts',
    'properties',
    'whatsapp_threads',
    'messages',
    'leads',
    'lead_contacts',
    'labels',
    'lead_labels',
    'projects',
    'project_contacts',
    'project_labels',
    'appointments',
    'project_items',
    'quotes',
    'quote_items',
    'invoices',
    'payments',
    'purchases',
    'documents',
    'media_assets',
    'ai_runs'
  ];
begin
  foreach table_name in array app_tables
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I_select_authenticated on public.%I', table_name, table_name);
    execute format('create policy %I_select_authenticated on public.%I for select to authenticated using (true)', table_name, table_name);

    execute format('drop policy if exists %I_insert_authenticated on public.%I', table_name, table_name);
    execute format('create policy %I_insert_authenticated on public.%I for insert to authenticated with check (true)', table_name, table_name);

    execute format('drop policy if exists %I_update_authenticated on public.%I', table_name, table_name);
    execute format('create policy %I_update_authenticated on public.%I for update to authenticated using (true) with check (true)', table_name, table_name);

    execute format('drop policy if exists %I_delete_authenticated on public.%I', table_name, table_name);
    execute format('create policy %I_delete_authenticated on public.%I for delete to authenticated using (true)', table_name, table_name);
  end loop;
end
$$;

drop policy if exists storage_objects_authenticated_select on storage.objects;
create policy storage_objects_authenticated_select
on storage.objects
for select
to authenticated
using (bucket_id in ('crm-documents', 'crm-media', 'crm-private'));

drop policy if exists storage_objects_authenticated_insert on storage.objects;
create policy storage_objects_authenticated_insert
on storage.objects
for insert
to authenticated
with check (bucket_id in ('crm-documents', 'crm-media', 'crm-private'));

drop policy if exists storage_objects_authenticated_update on storage.objects;
create policy storage_objects_authenticated_update
on storage.objects
for update
to authenticated
using (bucket_id in ('crm-documents', 'crm-media', 'crm-private'))
with check (bucket_id in ('crm-documents', 'crm-media', 'crm-private'));

drop policy if exists storage_objects_authenticated_delete on storage.objects;
create policy storage_objects_authenticated_delete
on storage.objects
for delete
to authenticated
using (bucket_id in ('crm-documents', 'crm-media', 'crm-private'));

