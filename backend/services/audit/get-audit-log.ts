import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AuditFilters = { action?: string; entityType?: string; actorId?: string; from?: string; to?: string; page?: number };

export async function getAuditLog(filters: AuditFilters = {}) {
  const supabase = createAdminSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 50;
  let query = supabase.from("audit_logs").select(`
    id, action, entity_type, entity_id, old_value, new_value, metadata, created_at, performed_by_profile_id,
    actor:performed_by_profile_id (id, display_name, role_code)
  `, { count: "exact" });
  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.actorId) query = query.eq("performed_by_profile_id", filters.actorId);
  if (filters.from) query = query.gte("created_at", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) query = query.lte("created_at", new Date(`${filters.to}T23:59:59.999`).toISOString());
  const start = (page - 1) * pageSize;
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(start, start + pageSize - 1);
  if (error) throw error;
  const rows = data ?? [];
  const ids = (entityType: string) => rows.filter((row) => row.entity_type === entityType && row.entity_id).map((row) => row.entity_id as string);
  const [projects, items, invoices, payments, contacts, properties, quotes] = await Promise.all([
    ids("project").length ? supabase.from("projects").select("id, project_code, title").in("id", ids("project")) : Promise.resolve({ data: [], error: null }),
    ids("project_item").length ? supabase.from("project_items").select("id, title").in("id", ids("project_item")) : Promise.resolve({ data: [], error: null }),
    ids("invoice").length ? supabase.from("invoices").select("id, invoice_number").in("id", ids("invoice")) : Promise.resolve({ data: [], error: null }),
    ids("payment").length ? supabase.from("payments").select("id, reference_number, amount").in("id", ids("payment")) : Promise.resolve({ data: [], error: null }),
    ids("contact").length ? supabase.from("contacts").select("id, full_name").in("id", ids("contact")) : Promise.resolve({ data: [], error: null }),
    ids("property").length ? supabase.from("properties").select("id, property_name, address_line_1, unit_no").in("id", ids("property")) : Promise.resolve({ data: [], error: null }),
    ids("quote").length ? supabase.from("quotes").select("id, quote_number").in("id", ids("quote")) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [projects, items, invoices, payments, contacts, properties, quotes]) if (result.error) throw result.error;
  const labels = new Map<string, string>();
  for (const record of projects.data ?? []) labels.set(record.id, `${record.project_code} — ${record.title}`);
  for (const record of items.data ?? []) labels.set(record.id, record.title);
  for (const record of invoices.data ?? []) labels.set(record.id, record.invoice_number);
  for (const record of payments.data ?? []) labels.set(record.id, record.reference_number ?? `payment of $${Number(record.amount).toFixed(2)}`);
  for (const record of contacts.data ?? []) labels.set(record.id, record.full_name);
  for (const record of properties.data ?? []) labels.set(record.id, record.property_name ?? [record.address_line_1, record.unit_no].filter(Boolean).join(" "));
  for (const record of quotes.data ?? []) labels.set(record.id, record.quote_number);
  return { rows: rows.map((row) => ({ ...row, entity_label: row.entity_id ? labels.get(row.entity_id) ?? null : null })), total: count ?? 0, page, pageSize, pages: Math.max(1, Math.ceil((count ?? 0) / pageSize)) };
}
