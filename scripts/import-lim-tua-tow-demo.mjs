#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseWhatsAppExport } from "./lib/whatsapp-export-webhook.mjs";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const root = process.cwd();
const sourceFolder = path.join(root, "public/WhatsApp Chat with 38 Lim Tua Tow x EPS 2");
const marker = "[DEMO:38-LIM-TUA-TOW]";
const projectCode = "LTT-2026";
const legacyProjectCode = "DEMO-LTT-2026";
const threadExternalId = "demo:whatsapp:38-lim-tua-tow";

function envFrom(text) {
  const env = { ...process.env };
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !env[match[1]]) {
      env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

async function ok(query, label) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 28);
}

function iso(epoch) {
  return new Date(Number(epoch) * 1000).toISOString();
}

function attachment(body) {
  const match = body.match(/^(.+?) \(file attached\)(?:\n|$)/);
  return match ? { name: match[1].trim(), caption: body.slice(match[0].length).trim() } : null;
}

function preferredProfile(profiles, role) {
  const matching = profiles.filter((profile) => profile.role_code === role && profile.is_active);
  return matching.find((profile) => /demo/i.test(profile.display_name)) ?? matching[0] ?? null;
}

function singaporeTodayAt(hour, minute = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`).toISOString();
}

const env = envFrom(await readFile(path.join(root, ".env.local"), "utf8"));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const profiles = await ok(
  db.from("profiles").select("id,display_name,role_code,is_active").in("role_code", ["coordinator", "field_worker"]).order("display_name"),
  "Read demo-capable profiles",
);
const coordinator = preferredProfile(profiles, "coordinator");
const worker = preferredProfile(profiles, "field_worker");

if (!coordinator || !worker) {
  throw new Error("An active coordinator and an active field-worker profile are required before importing this demo project.");
}

console.log(`Coordinator: ${coordinator.display_name}`);
console.log(`Field worker: ${worker.display_name}`);
console.log(`Project: ${projectCode} - 38 Lim Tua Tow - rental readiness works`);

if (VERIFY) {
  const project = await ok(
    db.from("projects").select(`
      id,project_code,title,status_code,source_lead_id,whatsapp_thread_id,coordinator_profile_id,scheduled_start_at,completed_at,
      project_items(id,status_code,assigned_profile_id,before_after_required),
      appointments(id,status_code,assigned_profile_id,scheduled_start_at),
      project_team_members(profile_id,team_role)
    `).eq("project_code", projectCode).maybeSingle(),
    "Verify demo project",
  );
  if (!project) throw new Error("The demo project does not exist yet.");
  const items = project.project_items ?? [];
  const appointments = project.appointments ?? [];
  const team = project.project_team_members ?? [];
  const [{ count: messageCount, error: messageCountError }, { count: quoteCount, error: quoteCountError }, { count: draftCount, error: draftCountError }] = await Promise.all([
    db.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", project.whatsapp_thread_id),
    db.from("quotes").select("id", { count: "exact", head: true }).eq("project_id", project.id),
    db.from("review_drafts").select("id", { count: "exact", head: true }).eq("approved_project_id", project.id),
  ]);
  if (messageCountError) throw new Error(`Verify Inbox messages: ${messageCountError.message}`);
  if (quoteCountError) throw new Error(`Verify blank quotes: ${quoteCountError.message}`);
  if (draftCountError) throw new Error(`Verify blank review drafts: ${draftCountError.message}`);
  const valid =
    project.status_code === "scheduled" &&
    project.title === "38 Lim Tua Tow - rental readiness works" &&
    project.source_lead_id === null &&
    Boolean(project.whatsapp_thread_id) &&
    project.completed_at === null &&
    project.coordinator_profile_id === coordinator.id &&
    items.length > 0 &&
    items.every((item) => item.status_code === "pending" && item.assigned_profile_id === worker.id) &&
    appointments.some((appointment) => appointment.status_code === "scheduled" && appointment.assigned_profile_id === worker.id) &&
    team.some((member) => member.profile_id === coordinator.id) &&
    team.some((member) => member.profile_id === worker.id) &&
    (messageCount ?? 0) > 0 &&
    (quoteCount ?? 0) === 0 &&
    (draftCount ?? 0) === 0;
  if (!valid) throw new Error("The demo project exists but is not correctly prepared for both role workspaces.");
  console.log(`Verified: one scheduled project, ${items.length} pending assigned items, ${appointments.length} scheduled appointment, ${team.length} team members.`);
  console.log(`Verified Inbox: one linked deduplicated conversation with ${messageCount} source messages.`);
  console.log("Verified demo blanks: no linked lead, quote, or approved review draft.");
  process.exit(0);
}

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to create/reset the demo project.");
  process.exit(0);
}

const scheduledStart = singaporeTodayAt(10);
const scheduledEnd = singaporeTodayAt(17);

let contact = await ok(
  db.from("contacts").select("*").eq("primary_phone", "+6581482787").maybeSingle(),
  "Find demo customer",
);
if (!contact) {
  contact = await ok(
    db.from("contacts").insert({
      full_name: "Angela Chan - Demo",
      primary_phone: "+6581482787",
      whatsapp_number: "+6581482787",
      notes: `${marker} Imported from the supplied WhatsApp bundle for product demonstrations.`,
    }).select("*").single(),
    "Create demo customer",
  );
}

let property = await ok(
  db.from("properties").select("*").eq("address_line_1", "38 Lim Tua Tow Road").eq("postal_code", "547796").maybeSingle(),
  "Find demo property",
);
if (!property) {
  property = await ok(
    db.from("properties").insert({
      property_name: "38 Lim Tua Tow",
      address_line_1: "38 Lim Tua Tow Road",
      postal_code: "547796",
      country_code: "SG",
      access_notes: "Demo record - confirm access with the coordinator before arrival.",
    }).select("*").single(),
    "Create demo property",
  );
}

await ok(db.from("property_contacts").upsert({
  property_id: property.id,
  contact_id: contact.id,
  role_code: "owner",
  is_primary: true,
  notes: `${marker} Primary contact from the supplied WhatsApp project bundle.`,
}, { onConflict: "property_id,contact_id,role_code" }), "Link demo property contact");

const chatPath = path.join(sourceFolder, "WhatsApp Chat with 38 Lim Tua Tow x EPS.txt");
const chatRecords = parseWhatsAppExport(await readFile(chatPath, "utf8"));
const firstMessageAt = iso(chatRecords[0].timestamp);
const lastMessageAt = iso(chatRecords.at(-1).timestamp);
let thread = await ok(
  db.from("whatsapp_threads").select("*").eq("source_channel_code", "whatsapp").eq("external_thread_id", threadExternalId).maybeSingle(),
  "Find demo Inbox conversation by stable ID",
);
if (!thread) {
  thread = await ok(
    db.from("whatsapp_threads").select("*").eq("contact_id", contact.id).ilike("thread_subject", "%38 Lim Tua Tow%").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    "Check for an existing 38 Lim Tua Tow conversation",
  );
}
if (thread) {
  thread = await ok(
    db.from("whatsapp_threads").update({
      external_thread_id: threadExternalId,
      thread_subject: "38 Lim Tua Tow x EPS",
      last_message_at: lastMessageAt,
      is_archived: false,
    }).eq("id", thread.id).select("*").single(),
    "Reuse existing demo Inbox conversation",
  );
} else {
  thread = await ok(
    db.from("whatsapp_threads").insert({
      contact_id: contact.id,
      source_channel_code: "whatsapp",
      external_thread_id: threadExternalId,
      thread_subject: "38 Lim Tua Tow x EPS",
      last_message_at: lastMessageAt,
      is_archived: false,
      created_at: firstMessageAt,
    }).select("*").single(),
    "Create demo Inbox conversation",
  );
}

const businessSenders = new Set(["Yong Eps Services", "Tania"]);
const messageRows = chatRecords.map((record, index) => {
  const file = attachment(record.body);
  const content = file
    ? `Attachment: ${file.name}${file.caption ? `\n${file.caption}` : ""}`
    : record.body;
  return {
    thread_id: thread.id,
    direction_code: businessSenders.has(record.sender) ? "outbound" : "inbound",
    message_type_code: "text",
    external_message_id: `demo_ltt_${hash(`${record.timestamp}:${record.sender}:${record.body}:${index}`)}`,
    sender_name: record.sender,
    content,
    provider_payload: {
      source: "whatsapp_export",
      demo_source: "38-lim-tua-tow",
      attachment_filename: file?.name ?? null,
    },
    sent_at: iso(record.timestamp),
    created_at: iso(record.timestamp),
  };
});
const existingMessageIds = new Set((await ok(
  db.from("messages").select("external_message_id").eq("thread_id", thread.id),
  "Read existing demo message IDs",
)).map((message) => message.external_message_id));
const missingMessages = messageRows.filter((message) => !existingMessageIds.has(message.external_message_id));
for (let index = 0; index < missingMessages.length; index += 200) {
  await ok(db.from("messages").insert(missingMessages.slice(index, index + 200)), "Insert deduplicated demo Inbox messages");
}

let project = await ok(
  db.from("projects").select("*").eq("project_code", projectCode).maybeSingle(),
  "Find existing demo project",
);
if (!project) {
  project = await ok(
    db.from("projects").select("*").eq("project_code", legacyProjectCode).maybeSingle(),
    "Find legacy demo project reference",
  );
}
const projectValues = {
  project_code: projectCode,
  title: "38 Lim Tua Tow - rental readiness works",
  status_code: "scheduled",
  source_channel_code: "whatsapp",
  primary_contact_id: contact.id,
  primary_property_id: property.id,
  whatsapp_thread_id: thread.id,
  coordinator_profile_id: coordinator.id,
  scope_summary: "Incomplete demonstration project based on Q250901R-4: removal works, cove-ceiling repair, bedroom carpentry removal, window awning removal, power points, painting, and water-heater preparation.",
  remarks: `${marker} Intentionally kept incomplete and editable for demo videos. Do not close this project before recording the worker and coordinator flows.`,
  enquiry_at: "2026-03-02T06:28:00.000Z",
  scheduled_start_at: scheduledStart,
  scheduled_end_at: scheduledEnd,
  handover_at: null,
  completed_at: null,
  qa_status: "pending",
  customer_signoff_status: "pending",
  qa_reviewed_at: null,
  customer_signed_at: null,
  completion_summary: null,
  worker_update_summary: "Waiting for the field worker to begin the demo workflow.",
};

if (project) {
  project = await ok(
    db.from("projects").update(projectValues).eq("id", project.id).select("*").single(),
    "Reset demo project",
  );
  await ok(db.from("appointments").delete().eq("project_id", project.id), "Reset demo appointments");
  await ok(db.from("project_team_members").delete().eq("project_id", project.id), "Reset demo team");
  await ok(db.from("project_items").delete().eq("project_id", project.id), "Reset demo work items");
} else {
  project = await ok(
    db.from("projects").insert(projectValues).select("*").single(),
    "Create demo project",
  );
}

await ok(db.from("project_contacts").upsert({
  project_id: project.id,
  contact_id: contact.id,
  role_code: "owner",
  is_primary: true,
  notes: `${marker} Demo customer contact.`,
}, { onConflict: "project_id,contact_id,role_code" }), "Link demo project contact");

await ok(db.from("project_team_members").insert([
  { project_id: project.id, profile_id: coordinator.id, team_role: "coordinator", is_lead: true },
  { project_id: project.id, profile_id: worker.id, team_role: "field_worker", is_lead: false },
]), "Create demo project team");

const scope = [
  {
    title: "Remove living-room window films",
    description: "Remove and dispose of the existing frosted window films.",
    area: "Living Room",
    amount: 240,
    priority: "normal",
  },
  {
    title: "Repair drooping cove ceiling",
    description: "Make safe and repair the drooping cove ceiling above the main door.",
    area: "Main Door",
    amount: 280,
    priority: "high",
  },
  {
    title: "Remove built-in desks and shelves",
    description: "Remove built-in desks and shelves in two rear upper-floor bedrooms; retain the wardrobes.",
    area: "Upper Floor Bedrooms",
    amount: 600,
    priority: "normal",
  },
  {
    title: "Remove master-bedroom awning and grille",
    description: "Dismantle and dispose of the exterior window awning and grille obstructing the view.",
    area: "Master Bedroom",
    amount: 1180,
    priority: "normal",
  },
  {
    title: "Install additional bedroom power points",
    description: "Install dual 3-pin power points with casing in the agreed upstairs bedrooms.",
    area: "Upstairs Bedrooms",
    amount: 450,
    priority: "normal",
  },
  {
    title: "Prepare instant water-heater connection",
    description: "Provide power point, wiring, pipework and installation preparation under the basin; heater excluded.",
    area: "Under Basin",
    amount: 230,
    priority: "normal",
  },
];

await ok(db.from("project_items").insert(scope.map((item, index) => ({
  project_id: project.id,
  status_code: "pending",
  priority_code: item.priority,
  assigned_profile_id: worker.id,
  sort_order: index + 1,
  title: item.title,
  description: item.description,
  area_name: item.area,
  action_summary: "Review the area, take before evidence, complete the work, then add after evidence.",
  internal_note: `${marker} Leave incomplete until the demo recording is finished.`,
  quoted_amount: item.amount,
  scheduled_start_at: scheduledStart,
  scheduled_due_at: scheduledEnd,
  before_after_required: true,
  checklist_requirements: "Before photo; confirm scope; after photo; report any variation before proceeding.",
  item_group: "handyman",
  item_type: "repair",
}))), "Create incomplete demo work items");

await ok(db.from("appointments").insert({
  project_id: project.id,
  appointment_type_code: "work_execution",
  status_code: "scheduled",
  assigned_profile_id: worker.id,
  created_by_profile_id: coordinator.id,
  scheduled_start_at: scheduledStart,
  scheduled_end_at: scheduledEnd,
  customer_confirmation_status: "confirmed",
  worker_confirmation_status: "confirmed",
  notes: `${marker} Demo appointment kept scheduled so it is visible on the Coordinator Operations Desk.`,
}), "Create today's demo schedule entry");

const coverName = "IMG-20260306-WA0248.jpg";
const coverPath = `demo/38-lim-tua-tow/${coverName}`;
const coverBytes = await readFile(path.join(sourceFolder, coverName));
await ok(db.storage.from("crm-media").upload(coverPath, coverBytes, {
  contentType: "image/jpeg",
  upsert: true,
}), "Upload demo project cover");
const existingCover = await ok(
  db.from("media_assets").select("id").eq("project_id", project.id).eq("storage_path", coverPath).maybeSingle(),
  "Find demo cover record",
);
if (!existingCover) {
  await ok(db.from("media_assets").insert({
    project_id: project.id,
    storage_bucket: "crm-media",
    storage_path: coverPath,
    mime_type: "image/jpeg",
    media_type: "image",
    evidence_type: "customer_supplied",
    caption: "Source photo from the supplied 38 Lim Tua Tow WhatsApp bundle; not completion evidence.",
    captured_at: "2026-03-06T08:50:00.000Z",
  }), "Create demo cover record");
}

const quoteName = "Q250901R-4 (38 Lim Tua Tow Road Singapore 547796) +65 8148 2787.pdf";
const quotePath = `demo/38-lim-tua-tow/${quoteName.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
const quoteBytes = await readFile(path.join(sourceFolder, quoteName));
await ok(db.storage.from("crm-documents").upload(quotePath, quoteBytes, {
  contentType: "application/pdf",
  upsert: true,
}), "Upload source quotation");
const existingDocument = await ok(
  db.from("documents").select("id").eq("project_id", project.id).eq("storage_path", quotePath).maybeSingle(),
  "Find source quotation record",
);
if (!existingDocument) {
  await ok(db.from("documents").insert({
    project_id: project.id,
    document_type_code: "quotation",
    file_name: quoteName,
    storage_bucket: "crm-documents",
    storage_path: quotePath,
    mime_type: "application/pdf",
    file_size_bytes: quoteBytes.byteLength,
    is_customer_visible: false,
  }), "Create source quotation record");
}

console.log(`Created/reset project ${project.project_code} (${project.id}).`);
console.log("Status: scheduled; every work item: pending; before/after evidence: required.");
console.log(`Inbox: linked one deduplicated conversation; inserted ${missingMessages.length} previously missing source messages.`);
console.log("Lead, quote, invoice, payment, and review draft remain blank for the demo workflow.");
console.log("The project is visible in Inbox, Projects, Calendar, Coordinator Operations Desk, and the assigned Field Workspace.");
