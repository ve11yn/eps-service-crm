drop index if exists public.pricing_items_catalog_source_row_unique;
create unique index if not exists pricing_items_catalog_source_row_unique
  on public.pricing_items (catalog_id, source_row_number);
