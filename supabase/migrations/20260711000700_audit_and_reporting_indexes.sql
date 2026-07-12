-- Support filtered audit-log and reporting screens at operational scale.
create index if not exists audit_logs_action_created_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (performed_by_profile_id, created_at desc);

create index if not exists projects_source_created_idx
  on public.projects (source_channel_code, created_at desc);

create index if not exists payments_status_created_idx
  on public.payments (status_code, created_at desc);

create index if not exists invoices_due_balance_idx
  on public.invoices (due_at, balance_due_amount)
  where balance_due_amount > 0;
