#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseWhatsAppExport } from "./lib/whatsapp-export-webhook.mjs";

if (!process.argv.includes("--replace-verified-mock-data")) {
  throw new Error("Re-run with --replace-verified-mock-data to confirm replacement.");
}

const root = process.cwd();
const folder = path.join(root, "public/WhatsApp Chat with 🆗EPS7 167 Tai Keng Gardens copy");
const chatPath = path.join(folder, "WhatsApp Chat with 🆗EPS7 167 Tai Keng Gardens.txt");
const marker = "Imported from EPS7 167 Tai Keng Gardens WhatsApp export";

function envFrom(text) {
  const env = { ...process.env };
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 28);
}

function iso(epoch) {
  return new Date(Number(epoch) * 1000).toISOString();
}

function attachment(body) {
  const match = body.match(/^(.+?) \(file attached\)(?:\n|$)/);
  return match
    ? { name: match[1].trim(), caption: body.slice(match[0].length).trim() }
    : null;
}

function mediaKind(name) {
  const ext = path.extname(name).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return { type: "image", mime: ext === ".png" ? "image/png" : "image/jpeg" };
  }
  if ([".mp4", ".mov"].includes(ext)) {
    return { type: "video", mime: ext === ".mov" ? "video/quicktime" : "video/mp4" };
  }
  return { type: "document", mime: ext === ".pdf" ? "application/pdf" : "application/octet-stream" };
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ok(query, label) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const env = envFrom(await readFile(path.join(root, ".env.local"), "utf8"));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Refuse to erase a database that contains contacts other than the verified mocks
// or an earlier run of this exact import.
const oldContacts = await ok(db.from("contacts").select("id,full_name,notes"), "Read contacts");
const safeContacts = new Set(["John Doe", "Test User", "167 Tai Keng Gardens Customer"]);
const unexpected = oldContacts.filter(
  (row) => !safeContacts.has(row.full_name) && !String(row.notes ?? "").includes(marker),
);
if (unexpected.length) {
  throw new Error(`Safety check stopped replacement: ${unexpected.length} non-mock contact(s) exist.`);
}

const [oldMedia, oldDocuments, oldLeads, oldProjects, oldQuotes, oldThreads, oldReviews] = await Promise.all([
  ok(db.from("media_assets").select("id,storage_bucket,storage_path"), "Read media"),
  ok(db.from("documents").select("id,storage_bucket,storage_path"), "Read documents"),
  ok(db.from("leads").select("id"), "Read leads"),
  ok(db.from("projects").select("id"), "Read projects"),
  ok(db.from("quotes").select("id"), "Read quotes"),
  ok(db.from("whatsapp_threads").select("id"), "Read threads"),
  ok(db.from("review_drafts").select("id"), "Read reviews"),
]);

for (const bucket of ["crm-media", "crm-documents", "crm-private"]) {
  const paths = [...oldMedia, ...oldDocuments]
    .filter((row) => row.storage_bucket === bucket && row.storage_path)
    .map((row) => row.storage_path);
  if (paths.length) await ok(db.storage.from(bucket).remove(paths), `Remove old ${bucket} files`);
}

const oldIds = [...oldContacts, ...oldLeads, ...oldProjects, ...oldQuotes, ...oldThreads, ...oldReviews].map((row) => row.id);
if (oldIds.length) await ok(db.from("audit_logs").delete().in("entity_id", oldIds), "Remove mock activities");
await ok(
  db.from("audit_logs").delete().in("entity_type", [
    "contact", "customer", "property", "lead", "project", "project_item",
    "quote", "quote_item", "invoice", "payment", "media_asset",
    "review_draft", "appointment",
  ]),
  "Remove remaining mock operational activities",
);
for (const table of [
  "documents",
  "media_assets",
  "second_brain_summaries",
  "ai_runs",
  "quotes",
  "projects",
  "leads",
  "whatsapp_threads",
  "properties",
  "contacts",
]) {
  await ok(db.from(table).delete().not("id", "is", null), `Clear ${table}`);
}

const contact = await ok(
  db.from("contacts").insert({
    full_name: "167 Tai Keng Gardens Customer",
    primary_phone: "+6590265601",
    whatsapp_number: "+6590265601",
    notes: `${marker}. The customer's name is not present in the supplied export.`,
    created_at: "2026-04-18T13:12:00Z",
  }).select("*").single(),
  "Create customer",
);
const property = await ok(
  db.from("properties").insert({
    property_name: "167 Tai Keng Gardens",
    address_line_1: "167 Tai Keng Gardens",
    postal_code: "535439",
    country_code: "SG",
    created_at: "2026-04-18T13:12:00Z",
  }).select("*").single(),
  "Create property",
);
await ok(db.from("property_contacts").insert({
  property_id: property.id,
  contact_id: contact.id,
  role_code: "owner",
  is_primary: true,
  notes: "Owner role inferred from the field conversation.",
}), "Link property");

const records = parseWhatsAppExport(await readFile(chatPath, "utf8"));
const firstAt = iso(records[0].timestamp);
const lastAt = iso(records.at(-1).timestamp);
const thread = await ok(
  db.from("whatsapp_threads").insert({
    contact_id: contact.id,
    external_thread_id: "export:eps7:167-tai-keng-gardens",
    thread_subject: "EPS7 167 Tai Keng Gardens",
    latest_ai_summary: "Completed S$780 handyman job with site visit, approved quote, field evidence, invoice and receipt.",
    ai_last_summarized_at: lastAt,
    last_message_at: lastAt,
    created_at: firstAt,
  }).select("*").single(),
  "Create chat thread",
);
const lead = await ok(
  db.from("leads").insert({
    lead_code: "LEAD-TKG-20260418",
    title: "167 Tai Keng Gardens - handyman repairs",
    status_code: "site_visit",
    primary_contact_id: contact.id,
    primary_property_id: property.id,
    whatsapp_thread_id: thread.id,
    summary: "Site visit requested for lighting, doorbell, timber repairs, wall-mount removal and related handyman work.",
    lead_summary: "Site visit completed and scope progressed to quotation Q250910 for S$780.",
    ai_summary: "Source data imported from the supplied WhatsApp export and PDFs.",
    customer_request: "Inspect lighting and doorbell, remove a wall bracket, repair timber flooring/stairs and repaint rust.",
    qualification_notes: "Site visit evidence posted 20 April 2026; quote issued 21 April 2026.",
    site_visit_required: true,
    received_at: firstAt,
    last_activity_at: lastAt,
    created_at: firstAt,
  }).select("*").single(),
  "Create lead",
);
await ok(db.from("lead_contacts").insert({ lead_id: lead.id, contact_id: contact.id, role_code: "owner", is_primary: true }), "Link lead");

const project = await ok(
  db.from("projects").insert({
    project_code: "PROJ-TKG-20260424",
    title: "167 Tai Keng Gardens - approved repair works",
    source_lead_id: lead.id,
    status_code: "scheduled",
    primary_contact_id: contact.id,
    primary_property_id: property.id,
    whatsapp_thread_id: thread.id,
    scope_summary: "Nine approved lines from Q250910: lighting, flooring/timber repairs, TV mount removal, switch cover, FOC disposal/door touch-up and outdoor light checks.",
    remarks: `${marker}. Missing exported files remain referenced in chat but are not presented as evidence.`,
    enquiry_at: firstAt,
    scheduled_start_at: "2026-04-24T02:00:00Z",
    scheduled_end_at: "2026-04-24T08:45:00Z",
    handover_at: "2026-04-24T08:45:00Z",
    completed_at: "2026-04-24T08:45:00Z",
    payment_due_at: "2026-04-24T15:59:59Z",
    customer_signoff_status: "approved",
    customer_signed_at: "2026-04-25T04:07:00Z",
    customer_signed_by_name: "Customer (paid receipt recorded)",
    qa_status: "approved",
    qa_reviewed_at: "2026-04-25T04:07:00Z",
    qa_notes: "Completion supported by final field updates and the paid receipt; no separate signed QA form was supplied.",
    completion_summary: "Approved work completed 24 April 2026; INB250915 was paid in full.",
    worker_update_summary: "Workers reported completion across lighting, flooring/timber, wall repair, switch cover and disposal scope.",
    created_at: "2026-04-23T00:27:00Z",
  }).select("*").single(),
  "Create project",
);
await ok(db.from("project_contacts").insert({ project_id: project.id, contact_id: contact.id, role_code: "owner", is_primary: true }), "Link project");

const scope = [
  ["L2 Master Bathroom: mirror strip light", "Replace LED light strip around the mirror, estimated 10 metres.", "L2 Master Bathroom", 150],
  ["L2 Rooms: flooring gaps", "Fill gaps with wood putty and touch up with clear varnish.", "L2 Rooms", 180],
  ["Timber flooring and stairway repairs", "Touch up L2 landing and fill/touch up the L3 stairway slab with black varnish.", "L2 Landing / L3 Stairway", 220],
  ["TV wall mount and holes", "Remove one wall mount, repair the affected wall and touch up with coloured varnish.", "TV feature wall", 180],
  ["Outdoor switch cover", "Supply and install one weatherproof switch cover.", "Outdoor", 50],
  ["L2 Master Bathroom: light bulbs", "Install three owner-supplied light bulbs (FOC).", "L2 Master Bathroom", 0],
  ["Disposal services", "Remove sofa, armchair, settee and two outdoor wooden chairs (FOC).", "Living / Balcony", 0],
  ["Side door rust touch-up", "Sand and touch up with black paint (FOC).", "Side door", 0],
  ["Outdoor plant-area lights", "Check two outdoor lights; installation labour only if required.", "Outdoor plants area", 0],
];
const items = await ok(
  db.from("project_items").insert(scope.map(([title, description, area, amount], index) => ({
    project_id: project.id,
    status_code: "completed",
    priority_code: "normal",
    sort_order: index + 1,
    title,
    description,
    area_name: area,
    action_summary: "Completed according to the field updates.",
    quoted_amount: amount,
    scheduled_start_at: "2026-04-24T02:00:00Z",
    scheduled_due_at: "2026-04-24T08:45:00Z",
    started_at: "2026-04-24T02:00:00Z",
    completed_at: "2026-04-24T08:45:00Z",
    before_after_required: false,
    checklist_requirements: "Review supplied evidence against the quoted scope.",
    item_group: "handyman",
    item_type: "repair",
    created_at: "2026-04-23T00:27:00Z",
  }))).select("*"),
  "Create work items",
);
const item = (line) => items.find((row) => row.sort_order === line);

const quote = await ok(
  db.from("quotes").insert({
    lead_id: lead.id,
    project_id: project.id,
    quote_number: "Q250910",
    version_number: 1,
    status_code: "approved",
    subtotal_amount: 780,
    discount_amount: 0,
    total_amount: 780,
    notes: "Imported from supplied Q250910 PDF dated 21 April 2026.",
    approved_scope_summary: "Nine approved lines; lines 6-9 are FOC or conditional at S$0.",
    negotiation_summary: "No rejected or revised quote was present in the supplied export.",
    sent_at: "2026-04-22T10:17:00Z",
    delivered_at: "2026-04-22T10:17:00Z",
    delivery_method: "whatsapp",
    delivery_reference: "Export message dated 22 April 2026",
    approved_at: "2026-04-23T00:25:00Z",
    valid_until: "2026-05-21T15:59:59Z",
    created_at: "2026-04-21T00:34:30Z",
  }).select("*").single(),
  "Create quote",
);
await ok(db.from("quote_items").insert(scope.map(([title, description, , amount], index) => ({
  quote_id: quote.id,
  source_project_item_id: item(index + 1).id,
  line_no: index + 1,
  title,
  description,
  quantity: 1,
  unit_label: "item",
  unit_price: amount,
  total_price: amount,
  decision_status: "approved",
  pricing_match_status: "manual",
  pricing_match_confidence: 1,
  pricing_match_method: "source_document",
  pricing_match_notes: "Verified against supplied Q250910 PDF.",
}))), "Create quote items");

const invoice = await ok(
  db.from("invoices").insert({
    project_id: project.id,
    quote_id: quote.id,
    invoice_number: "INB250915",
    status_code: "paid",
    subtotal_amount: 780,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 780,
    balance_due_amount: 0,
    issued_at: "2026-04-23T00:25:00Z",
    due_at: "2026-04-24T15:59:59Z",
    paid_at: "2026-04-25T04:07:00Z",
    payment_terms_days: 1,
    notes: "Imported from INB250915 invoice and R-INB250915 receipt.",
    created_at: "2026-04-23T00:25:00Z",
  }).select("*").single(),
  "Create invoice",
);
await ok(db.from("invoice_items").insert(scope.map(([title, description, , amount], index) => ({
  invoice_id: invoice.id,
  project_item_id: item(index + 1).id,
  line_no: index + 1,
  title,
  description,
  quantity: 1,
  unit_label: "item",
  unit_price: amount,
  total_price: amount,
}))), "Create invoice items");
const payment = await ok(
  db.from("payments").insert({
    project_id: project.id,
    invoice_id: invoice.id,
    status_code: "paid",
    amount: 780,
    payment_method: "Not stated in supplied receipt",
    reference_number: "R-INB250915",
    proof_reference: "Supplied receipt PDF",
    reported_at: "2026-04-25T04:07:00Z",
    verified_at: "2026-04-25T04:07:00Z",
    notes: "Full payment recorded from supplied receipt.",
    created_at: "2026-04-25T04:07:00Z",
  }).select("*").single(),
  "Create payment",
);

const available = new Set(await readdir(folder));
const messageRows = records.map((record, index) => {
  const file = attachment(record.body);
  const kind = file ? mediaKind(file.name) : null;
  return {
    thread_id: thread.id,
    direction_code: "system",
    message_type_code: kind?.type ?? "text",
    external_message_id: `export_${hash(`${record.timestamp}:${record.sender}:${record.body}:${index}`)}`,
    sender_name: record.sender,
    content: file ? null : record.body,
    media_caption: file?.caption || file?.name || null,
    provider_payload: {
      source: "whatsapp_export",
      attachment_filename: file?.name ?? null,
      attachment_included: file ? available.has(file.name) : false,
    },
    sent_at: iso(record.timestamp),
    created_at: iso(record.timestamp),
  };
});
const messages = await ok(db.from("messages").insert(messageRows).select("*"), "Create chat messages");

await ok(db.from("review_drafts").insert({
  thread_id: thread.id,
  lead_id: lead.id,
  contact_id: contact.id,
  property_id: property.id,
  approved_project_id: project.id,
  status: "approved",
  source_channel_code: "whatsapp",
  extraction_payload: {
    summary: "Site visit, quotation and completed handyman works for 167 Tai Keng Gardens.",
    customerName: contact.full_name,
    contactPhone: contact.primary_phone,
    addressLine1: property.address_line_1,
    postalCode: property.postal_code,
    siteVisitRequired: true,
    workItems: scope.map(([title, description]) => ({ title, description })),
    confidence: 1,
  },
  raw_conversation: records.map((record) => ({ direction: "system", senderName: record.sender, sentAt: iso(record.timestamp), text: record.body })),
  review_notes: `${marker}. Source documents and available media were preserved.`,
  reviewed_at: "2026-04-25T04:07:00Z",
  approved_at: "2026-04-25T04:07:00Z",
  created_at: firstAt,
}), "Create approved inbox record");

await ok(db.from("appointments").insert([
  {
    lead_id: lead.id,
    appointment_type_code: "site_visit",
    status_code: "completed",
    scheduled_start_at: "2026-04-20T04:00:00Z",
    scheduled_end_at: "2026-04-20T05:00:00Z",
    completed_at: "2026-04-20T10:44:00Z",
    customer_confirmation_status: "confirmed",
    worker_confirmation_status: "confirmed",
    notes: "Site visit reconstructed from the actual 20 April field-message timeline.",
  },
  {
    project_id: project.id,
    appointment_type_code: "work_execution",
    status_code: "completed",
    scheduled_start_at: "2026-04-24T02:00:00Z",
    scheduled_end_at: "2026-04-24T08:45:00Z",
    completed_at: "2026-04-24T08:45:00Z",
    customer_confirmation_status: "confirmed",
    worker_confirmation_status: "confirmed",
    notes: "Execution window reconstructed from the 24 April field updates.",
  },
]), "Create schedule history");

function itemFor(name) {
  if (/WA0039/.test(name)) return item(4);
  if (/WA0040/.test(name)) return item(8);
  if (/WA0163|WA0164|WA0148|WA0149|WA0150|WA0151|WA0152/.test(name)) return item(3);
  if (/WA0154|WA0155/.test(name)) return item(9);
  if (/WA0162/.test(name)) return item(2);
  if (/WA0185|WA0187|WA0188/.test(name)) return item(7);
  return null;
}

let uploadedMedia = 0;
for (const [index, record] of records.entries()) {
  const file = attachment(record.body);
  if (!file || !available.has(file.name)) continue;
  const kind = mediaKind(file.name);
  if (!["image", "video"].includes(kind.type)) continue;
  const bytes = await readFile(path.join(folder, file.name));
  const storagePath = `whatsapp-import/167-tai-keng-gardens/${safeName(file.name)}`;
  await ok(db.storage.from("crm-media").upload(storagePath, bytes, { contentType: kind.mime, upsert: true }), `Upload ${file.name}`);
  const linkedItem = itemFor(file.name);
  await ok(db.from("media_assets").insert({
    lead_id: lead.id,
    project_id: project.id,
    project_item_id: linkedItem?.id ?? null,
    message_id: messages[index].id,
    storage_bucket: "crm-media",
    storage_path: storagePath,
    mime_type: kind.mime,
    media_type: kind.type,
    evidence_type: /20260418/.test(file.name) ? "customer_supplied" : /20260302/.test(file.name) ? "materials" : "after",
    caption: file.caption || file.name,
    captured_at: iso(record.timestamp),
  }), `Create media ${file.name}`);
  uploadedMedia += 1;
}

const docs = [
  ["Q250910 (167 Tai Keng Gardens Singapore  535439) 90265601.pdf", "quotation", { quote_id: quote.id }],
  ["167 Tai Keng Gardens Singapore  535439.pdf", "invoice", { invoice_id: invoice.id }],
  ["R-INB250915 (167 Tai Keng Gardens Singapore  535439).pdf", "payment_proof", { payment_id: payment.id }],
];
for (const [name, type, relation] of docs) {
  const bytes = await readFile(path.join(folder, name));
  const storagePath = `whatsapp-import/167-tai-keng-gardens/${safeName(name)}`;
  await ok(db.storage.from("crm-documents").upload(storagePath, bytes, { contentType: "application/pdf", upsert: true }), `Upload ${name}`);
  await ok(db.from("documents").insert({
    lead_id: lead.id,
    project_id: project.id,
    ...relation,
    document_type_code: type,
    file_name: name,
    file_size_bytes: bytes.byteLength,
    storage_bucket: "crm-documents",
    storage_path: storagePath,
    mime_type: "application/pdf",
    is_customer_visible: true,
  }), `Create document ${name}`);
}

await ok(db.from("second_brain_summaries").insert([
  { entity_type: "lead", entity_id: lead.id, summary_type: "lead", content: "Site visit request for lighting, doorbell, timber, wall and rust-related works; progressed to Q250910.", source_type: "system", is_locked: true },
  { entity_type: "quote", entity_id: quote.id, summary_type: "approved_scope", content: "Q250910 approved at S$780: five paid lines totalling S$780 and four FOC/conditional lines at S$0.", source_type: "human", is_locked: true },
  { entity_type: "project", entity_id: project.id, summary_type: "worker_update", content: "Field team reported completion of the approved work on 24 April 2026.", source_type: "system", is_locked: true },
  { entity_type: "project", entity_id: project.id, summary_type: "completion", content: "Work completed with available evidence; INB250915 for S$780 was paid in full.", source_type: "human", is_locked: true },
]), "Create summaries");

for (const status of ["in_progress", "qa_review", "invoiced", "completed"]) {
  await ok(
    db.from("projects").update({ status_code: status }).eq("id", project.id),
    `Advance project to ${status}`,
  );
}

await ok(db.from("audit_logs").insert({
  action: "dataset.import",
  entity_type: "project",
  entity_id: project.id,
  metadata: { source: "WhatsApp export", folder: "EPS7 167 Tai Keng Gardens" },
  new_value: { project_code: project.project_code, quote_number: quote.quote_number, invoice_number: invoice.invoice_number, total: 780, uploaded_media: uploadedMedia },
}), "Record import activity");

const counts = {};
for (const table of ["contacts", "properties", "leads", "projects", "project_items", "quotes", "quote_items", "invoices", "payments", "messages", "media_assets", "documents", "review_drafts", "appointments"]) {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  counts[table] = count;
}
console.log(JSON.stringify({ success: true, contactId: contact.id, leadId: lead.id, projectId: project.id, quoteId: quote.id, invoiceId: invoice.id, uploadedMedia, counts }, null, 2));
