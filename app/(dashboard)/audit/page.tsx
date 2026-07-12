import Link from "next/link";
import { getAuditLog } from "@/backend/services/audit/get-audit-log";
import { listStaffAccounts } from "@/backend/services/auth/user-management";
import { formatDateTime, formatMoney } from "@/frontend/lib/format";
import { ConfigurationMenu } from "@/frontend/components/settings/configuration-menu";
import { requireAppSession } from "@/lib/auth/session";
import { Activity, BriefcaseBusiness, Camera, ChevronDown, ChevronRight, CircleDollarSign, FileText, House, ReceiptText, Settings2, SlidersHorizontal, UserRound, UsersRound, WalletCards, type LucideIcon } from "lucide-react";

const entityNames: Record<string, string> = {
  project: "project", project_item: "work item", project_field_update: "field issue",
  media_asset: "evidence photo", invoice: "invoice", payment: "payment", contact: "customer",
  property: "property", quote: "quote", configuration: "configuration",
  lead: "lead",
  pricing_item: "pricing item", pricing_catalog: "service catalogue",
  notion_migration: "rollout record", notion_migration_row: "migration record",
};

const entityIcons: Record<string, LucideIcon> = {
  project: BriefcaseBusiness, project_item: BriefcaseBusiness, project_field_update: BriefcaseBusiness,
  media_asset: Camera, invoice: ReceiptText, payment: WalletCards, contact: UsersRound,
  property: House, quote: CircleDollarSign, configuration: Settings2, pricing_item: ReceiptText,
  lead: FileText,
  pricing_catalog: ReceiptText,
};

const actionPhrases: Record<string, string> = {
  "projects.status_transition": "changed the status of",
  "projects.schedule_changed": "changed the schedule for",
  "project.management_updated": "updated",
  "project_items.create": "added",
  "project_items.update": "updated",
  "project_item.deleted": "removed",
  "project_items.reordered": "reordered work items in",
  "project_items.assign": "changed the worker assignment for",
  "project_items.defer": "deferred",
  "project_items.reopen": "reopened",
  "project_items.rework": "returned for rework",
  "project_items.approve_add_on": "approved the add-on",
  "project_items.reject_add_on": "rejected the add-on",
  "project_scope_changes.create": "recorded a scope change for",
  "project_scope_changes.decide": "made a scope-change decision for",
  "evidence.upload": "uploaded evidence for",
  "field_updates.resolve": "resolved",
  "invoices.create": "created",
  "invoices.update_draft": "updated",
  "invoices.issue": "issued",
  "payments.record": "recorded",
  "payments.verify": "verified",
  "payments.proof_upload": "uploaded payment proof for",
  "contacts.create": "created",
  "contacts.update": "updated",
  "contacts.merge": "merged a duplicate into",
  "properties.create": "created",
  "properties.update": "updated",
  "quotes.update_draft": "updated",
  "quotes.approve": "approved",
  "pricing_item.create": "created",
  "pricing_item.update": "updated",
  "pricing_item.archive": "archived",
  "pricing_items.bulk_import": "imported prices into",
  "leads.manual_create": "created",
};

const fieldNames: Record<string, string> = {
  status_code: "Status", qa_status: "QA status", customer_signoff_status: "Customer sign-off",
  scheduled_start_at: "Scheduled start", scheduled_end_at: "Scheduled end", handover_at: "Handover date",
  assigned_profile_id: "Assigned worker", before_after_required: "Before/after photos required",
  scheduled_due_at: "Due date", due_at: "Invoice due date", payment_terms_days: "Payment terms",
  tax_rate: "Tax rate", tax_amount: "Tax", subtotal_amount: "Subtotal", total_amount: "Total",
  balance_due_amount: "Outstanding balance", discount_amount: "Discount", notes: "Notes",
  customer_notes: "Customer notes", title: "Title", full_name: "Customer name", email: "Email",
  primary_phone: "Phone", whatsapp_number: "WhatsApp number", property_name: "Property name",
  address_line_1: "Address", unit_no: "Unit", access_notes: "Access instructions",
  priority_code: "Priority", quoted_amount: "Quoted amount", actual_cost: "Actual cost",
  labour_cost: "Labour cost", material_cost: "Material cost", is_archived: "Archived",
  resolved_at: "Resolved at", resolution_notes: "Resolution", add_on_status: "Add-on decision",
};

const ignoredFields = new Set(["id", "created_at", "updated_at", "performed_by_profile_id", "project_id"]);
const moneyFields = new Set(["tax_amount", "subtotal_amount", "total_amount", "balance_due_amount", "discount_amount", "quoted_amount", "actual_cost", "labour_cost", "material_cost", "amount"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function friendlyStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(key: string, value: unknown, profileNames: Map<string, string>) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (key.endsWith("profile_id") && typeof value === "string") return profileNames.get(value) ?? "Staff member";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (moneyFields.has(key) && typeof value === "number") return formatMoney(value);
  if (key === "tax_rate" && typeof value === "number") return `${value}%`;
  if ((key.endsWith("_at") || key.includes("date")) && typeof value === "string") return formatDateTime(value);
  if ((key.endsWith("status") || key.endsWith("status_code") || key === "priority_code") && typeof value === "string") return friendlyStatus(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "Updated";
  return String(value);
}

function changes(oldValue: unknown, newValue: unknown, profileNames: Map<string, string>) {
  const before = record(oldValue); const after = record(newValue);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.filter((key) => !ignoredFields.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .filter((key) => typeof before[key] !== "object" || before[key] === null || typeof after[key] !== "object" || after[key] === null)
    .slice(0, 10).map((key) => ({ label: fieldNames[key] ?? friendlyStatus(key), before: displayValue(key, before[key], profileNames), after: displayValue(key, after[key], profileNames) }));
}

function phrase(action: string) {
  if (actionPhrases[action]) return actionPhrases[action];
  if (action.startsWith("projects.closeout.")) return `${friendlyStatus(action.split(".").at(-1) ?? "updated").toLowerCase()} closeout for`;
  if (action.startsWith("field_updates.")) return `recorded ${friendlyStatus(action.split(".").at(-1) ?? "field update").toLowerCase()} on`;
  if (action.startsWith("settings.")) return "changed";
  return friendlyStatus(action.replaceAll(".", " ")).toLowerCase();
}

function pretty(value: unknown) { return value == null ? "—" : JSON.stringify(value, null, 2); }

function initialsFor(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

type AuditRow = Awaited<ReturnType<typeof getAuditLog>>["rows"][number];

function AuditActivity({ row, profileNames }: { row: AuditRow; profileNames: Map<string, string> }) {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const actorName = actor?.display_name ?? "System";
  const noun = entityNames[row.entity_type] ?? friendlyStatus(row.entity_type).toLowerCase();
  const label = row.entity_label ? `${noun} “${row.entity_label}”` : noun;
  const changed = changes(row.old_value, row.new_value, profileNames);
  const EntityIcon = entityIcons[row.entity_type] ?? Activity;
  const initials = initialsFor(actorName);
  return <article className={`audit-activity audit-kind-${row.entity_type.replaceAll("_", "-")}`}>
    <div className="audit-timeline-marker"><span><EntityIcon size={18}/></span></div>
    <details className="audit-activity-body">
      <summary className="audit-activity-summary">
        <div className="audit-summary-copy">
          <div className="audit-activity-meta"><span className="audit-activity-type">{friendlyStatus(noun)}</span><time>{formatDateTime(row.created_at)}</time></div>
          <div className="audit-activity-title"><span className="audit-actor-avatar" aria-hidden="true">{initials || <UserRound size={15}/>}</span><strong>{actorName} {phrase(row.action)} {label}.</strong></div>
        </div>
        <span className="audit-expand-icon" aria-hidden="true"><ChevronDown size={18}/></span>
      </summary>
      <div className="audit-activity-content">
        {changed.length ? <dl className="audit-change-list">{changed.map((change) => <div key={change.label}><dt>{change.label}</dt><dd><span className="audit-value-before">{change.before}</span><ChevronRight size={15} aria-hidden="true"/><strong className="audit-value-after">{change.after}</strong></dd></div>)}</dl> : <p className="audit-recorded-note">Activity recorded — no visible field values changed.</p>}
        <details className="audit-technical"><summary><FileText size={14}/>Technical details</summary><div className="report-two-column"><div><h4>Before</h4><pre className="audit-json">{pretty(row.old_value)}</pre></div><div><h4>After</h4><pre className="audit-json">{pretty(row.new_value)}</pre></div></div>{row.metadata ? <div><h4>Additional context</h4><pre className="audit-json">{pretty(row.metadata)}</pre></div> : null}</details>
      </div>
    </details>
  </article>;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAppSession(["owner", "admin"]); const params = await searchParams;
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const filters = { action: one("action"), entityType: one("entityType"), actorId: one("actorId"), from: one("from"), to: one("to"), page: Number(one("page") || 1) };
  const [result, staff] = await Promise.all([getAuditLog(filters), listStaffAccounts()]);
  const profileNames = new Map(staff.map((member) => [member.id, member.displayName]));
  const query = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "page" && value).map(([key, value]) => [key, String(value)]));
  const activeFilterCount = [filters.action, filters.entityType, filters.actorId, filters.from, filters.to].filter(Boolean).length;
  return <div className="page-stack"><section className="page-header"><div><h1>Configuration</h1><p className="helper-text">Review understandable records of important changes.</p></div></section><div className="configuration-menu-layout"><ConfigurationMenu activeSection="audit"/><div className="configuration-detail configuration-subpage"><div className="page-stack audit-page"><section className="page-header audit-page-header"><div className="audit-title-wrap"><span className="audit-title-icon"><Activity size={22}/></span><div><h1>Activity History</h1><p className="helper-text">See who changed what across customers, jobs, quotes, and payments.</p></div></div></section>
    <section className="audit-overview" aria-label="Activity summary"><article><strong>{result.total}</strong><span>Total activities</span></article><article><strong>{result.rows.length}</strong><span>Shown on this page</span></article><article><strong>{activeFilterCount}</strong><span>Active filters</span></article></section>
    <section className="panel audit-filter-panel"><div className="audit-filter-heading"><div><SlidersHorizontal size={18}/><strong>Filter activity</strong></div>{activeFilterCount ? <Link href="/audit" className="audit-clear-filters">Clear all</Link> : null}</div><form className="audit-filter-grid" method="get"><label className="field-block"><span className="field-label">Search activity</span><input className="input" name="action" placeholder="e.g. invoice, payment, assignment" defaultValue={filters.action}/></label><label className="field-block"><span className="field-label">Record type</span><select className="input input-select" name="entityType" defaultValue={filters.entityType}><option value="">All records</option>{Object.entries(entityNames).map(([value, label]) => <option key={value} value={value}>{friendlyStatus(label)}</option>)}</select></label><label className="field-block"><span className="field-label">Changed by</span><select className="input input-select" name="actorId" defaultValue={filters.actorId}><option value="">Anyone</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label><label className="field-block"><span className="field-label">From</span><input className="input" type="date" name="from" defaultValue={filters.from}/></label><label className="field-block"><span className="field-label">To</span><input className="input" type="date" name="to" defaultValue={filters.to}/></label><button className="button button-primary audit-filter-submit">Apply filters</button></form></section>
    <section className="panel audit-history-panel"><div className="panel-header audit-history-heading"><div><p className="eyebrow">Latest first</p><h2>{result.total} activities</h2></div><span className="helper-text">Page {result.page} of {result.pages}</span></div><div className="audit-timeline">{result.rows.map((row) => <AuditActivity key={row.id} row={row} profileNames={profileNames} />)}</div>{result.total === 0 ? <div className="audit-empty-state"><Activity size={28}/><h3>No activity found</h3><p>Try clearing one or more filters.</p></div> : null}<div className="audit-pagination"><span>Showing page {result.page} of {result.pages}</span><div className="action-row">{result.page > 1 ? <Link className="button button-secondary" href={`/audit?${query.toString()}&page=${result.page - 1}`}>Previous</Link> : null}{result.page < result.pages ? <Link className="button button-secondary" href={`/audit?${query.toString()}&page=${result.page + 1}`}>Next</Link> : null}</div></div></section>
  </div></div></div></div>;
}
