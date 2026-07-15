create index if not exists project_items_worker_queue_idx
  on public.project_items (assigned_profile_id, status_code, scheduled_due_at)
  where assigned_profile_id is not null;

create index if not exists media_assets_project_item_created_idx
  on public.media_assets (project_item_id, created_at desc)
  where project_item_id is not null;
