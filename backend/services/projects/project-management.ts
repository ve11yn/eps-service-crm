import "server-only";

import { logAuditEvent } from "@/backend/observability/audit";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type ItemInsert = Database["public"]["Tables"]["project_items"]["Insert"];
type ItemUpdate = Database["public"]["Tables"]["project_items"]["Update"];

const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const date = (value: unknown) => typeof value === "string" && value ? new Date(value).toISOString() : null;
const money = (value: unknown) => Math.max(0, Number(value) || 0);

function refresh() {
  invalidateCachedTags([CACHE_TAGS.projects, CACHE_TAGS.projectItems, CACHE_TAGS.dashboard, CACHE_TAGS.reports]);
}

async function event(input: { projectId: string; itemId: string; type: string; reason?: string | null; oldValue?: Json; newValue?: Json; actorId: string }) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("project_item_events").insert({
    project_id: input.projectId,
    project_item_id: input.itemId,
    event_type: input.type,
    reason: input.reason ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    created_by_profile_id: input.actorId,
  });
  if (error) throw error;
}

export async function updateProjectManagement(projectId: string, payload: Record<string, unknown>, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: old, error: oldError } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (oldError) throw oldError;
  const update: ProjectUpdate = {
    title: clean(payload.title) ?? old.title,
    primary_contact_id: clean(payload.primaryContactId),
    primary_property_id: clean(payload.primaryPropertyId),
    coordinator_profile_id: clean(payload.coordinatorProfileId),
    scope_summary: clean(payload.scopeSummary),
    remarks: clean(payload.remarks),
    enquiry_at: date(payload.enquiryAt),
    scheduled_start_at: date(payload.scheduledStartAt),
    scheduled_end_at: date(payload.scheduledEndAt),
    handover_at: date(payload.handoverAt),
    payment_due_at: date(payload.paymentDueAt),
    payment_follow_up_at: date(payload.paymentFollowUpAt),
    warranty_starts_at: date(payload.warrantyStartsAt),
    warranty_expires_at: date(payload.warrantyExpiresAt),
  };
  const { data, error } = await supabase.from("projects").update(update).eq("id", projectId).select("*").single();
  if (error) throw error;
  await logAuditEvent({ action: "project.management_updated", entityType: "project", entityId: projectId, performedByProfileId: actorId, oldValue: old as unknown as Json, newValue: data as unknown as Json });
  if (old.scheduled_start_at !== data.scheduled_start_at || old.scheduled_end_at !== data.scheduled_end_at || old.handover_at !== data.handover_at) {
    await logAuditEvent({ action: "projects.schedule_changed", entityType: "project", entityId: projectId, performedByProfileId: actorId, oldValue: { scheduled_start_at: old.scheduled_start_at, scheduled_end_at: old.scheduled_end_at, handover_at: old.handover_at }, newValue: { scheduled_start_at: data.scheduled_start_at, scheduled_end_at: data.scheduled_end_at, handover_at: data.handover_at } });
  }
  refresh();
  return data;
}

function itemValues(payload: Record<string, unknown>): ItemUpdate {
  const isAddOn = Boolean(payload.isAddOn);
  return {
    title: clean(payload.title) ?? "Untitled work item",
    description: clean(payload.description),
    area_name: clean(payload.areaName),
    action_summary: clean(payload.actionSummary),
    customer_note: clean(payload.customerNote),
    internal_note: clean(payload.internalNote),
    quoted_amount: money(payload.quotedAmount),
    actual_cost: money(payload.actualCost),
    labour_cost: money(payload.labourCost),
    material_cost: money(payload.materialCost),
    priority_code: ["normal", "high", "urgent"].includes(String(payload.priorityCode)) ? String(payload.priorityCode) : "normal",
    item_group: clean(payload.itemGroup),
    item_type: clean(payload.itemType),
    is_add_on: isAddOn,
    add_on_status: isAddOn ? (["proposed", "approved", "rejected"].includes(String(payload.addOnStatus)) ? String(payload.addOnStatus) : "proposed") : "not_applicable",
    is_pi: Boolean(payload.isPi),
    is_checklist_item: Boolean(payload.isChecklistItem),
    checklist_requirements: clean(payload.checklistRequirements),
    before_after_required: Boolean(payload.beforeAfterRequired),
  };
}

export async function createManagedProjectItem(projectId: string, payload: Record<string, unknown>, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: last } = await supabase.from("project_items").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const values = itemValues(payload);
  const insert: ItemInsert = { ...values, title: values.title ?? "Untitled work item", project_id: projectId, sort_order: (last?.sort_order ?? -1) + 1 };
  const { data, error } = await supabase.from("project_items").insert(insert).select("*").single();
  if (error) throw error;
  await event({ projectId, itemId: data.id, type: "created", newValue: data as unknown as Json, actorId });
  await logAuditEvent({ action: "project_items.create", entityType: "project_item", entityId: data.id, performedByProfileId: actorId, newValue: data as unknown as Json, metadata: { project_id: projectId } });
  refresh();
  return data;
}

export async function updateManagedProjectItem(itemId: string, payload: Record<string, unknown>, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: old, error: oldError } = await supabase.from("project_items").select("*").eq("id", itemId).single();
  if (oldError) throw oldError;
  const { data, error } = await supabase.from("project_items").update(itemValues(payload)).eq("id", itemId).select("*").single();
  if (error) throw error;
  await event({ projectId: old.project_id, itemId, type: "edited", oldValue: old as unknown as Json, newValue: data as unknown as Json, actorId });
  await logAuditEvent({ action: "project_items.update", entityType: "project_item", entityId: itemId, performedByProfileId: actorId, oldValue: old as unknown as Json, newValue: data as unknown as Json });
  refresh();
  return data;
}

export async function deleteManagedProjectItem(itemId: string, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: item, error: findError } = await supabase.from("project_items").select("*").eq("id", itemId).single();
  if (findError) throw findError;
  await logAuditEvent({ action: "project_item.deleted", entityType: "project_item", entityId: itemId, performedByProfileId: actorId, oldValue: item as unknown as Json });
  const { error } = await supabase.from("project_items").delete().eq("id", itemId);
  if (error) throw error;
  refresh();
}

export async function reorderProjectItems(projectId: string, itemIds: string[], actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: findError } = await supabase.from("project_items").select("id").eq("project_id", projectId);
  if (findError) throw findError;
  const valid = new Set((existing ?? []).map((row) => row.id));
  if (itemIds.length !== valid.size || itemIds.some((id) => !valid.has(id))) throw new Error("The item order does not match this project.");
  for (const [sortOrder, id] of itemIds.entries()) {
    const { error } = await supabase.from("project_items").update({ sort_order: sortOrder }).eq("id", id).eq("project_id", projectId);
    if (error) throw error;
  }
  await logAuditEvent({ action: "project_items.reordered", entityType: "project", entityId: projectId, performedByProfileId: actorId, newValue: itemIds as unknown as Json });
  refresh();
}

export async function performProjectItemAction(itemId: string, action: string, reason: string | null, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: old, error: findError } = await supabase.from("project_items").select("*").eq("id", itemId).single();
  if (findError) throw findError;
  let update: ItemUpdate;
  if (action === "defer") {
    if (!reason) throw new Error("A deferral reason is required.");
    update = { status_code: "deferred", is_deferred: true, deferred_reason: reason };
  } else if (action === "reopen" || action === "rework") {
    if (action === "rework" && !reason) throw new Error("A rework reason is required.");
    update = { status_code: "pending", is_deferred: false, deferred_reason: null, completed_at: null };
  } else if (action === "approve_add_on" || action === "reject_add_on") {
    if (!old.is_add_on) throw new Error("This work item is not an add-on.");
    update = { add_on_status: action === "approve_add_on" ? "approved" : "rejected", status_code: action === "reject_add_on" ? "deferred" : old.status_code, is_deferred: action === "reject_add_on" };
  } else throw new Error("Unsupported work-item action.");
  const { data, error } = await supabase.from("project_items").update(update).eq("id", itemId).select("*").single();
  if (error) throw error;
  await event({ projectId: old.project_id, itemId, type: action, reason, oldValue: old as unknown as Json, newValue: data as unknown as Json, actorId });
  await logAuditEvent({ action: `project_items.${action}`, entityType: "project_item", entityId: itemId, performedByProfileId: actorId, oldValue: old as unknown as Json, newValue: data as unknown as Json, metadata: { reason } });
  if (action === "rework") await supabase.from("project_scope_changes").insert({ project_id: old.project_id, project_item_id: itemId, change_type: "rework", status: "approved", description: reason!, requested_by: "Admin", decided_at: new Date().toISOString(), decided_by_profile_id: actorId, created_by_profile_id: actorId });
  refresh();
  return data;
}

export async function createScopeChange(projectId: string, payload: Record<string, unknown>, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const changeType = String(payload.changeType);
  if (!["add_on", "scope_change", "rework", "deferral"].includes(changeType)) throw new Error("Invalid scope change type.");
  const description = clean(payload.description);
  if (!description) throw new Error("A description is required.");
  const { data, error } = await supabase.from("project_scope_changes").insert({ project_id: projectId, project_item_id: clean(payload.projectItemId), change_type: changeType, description, amount_delta: Number(payload.amountDelta) || 0, requested_by: clean(payload.requestedBy), created_by_profile_id: actorId }).select("*").single();
  if (error) throw error;
  await logAuditEvent({ action: "project_scope_changes.create", entityType: "project", entityId: projectId, performedByProfileId: actorId, newValue: data as unknown as Json });
  refresh();
  return data;
}

export async function decideScopeChange(changeId: string, status: string, actorId: string) {
  if (!["approved", "rejected"].includes(status)) throw new Error("Decision must be approved or rejected.");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("project_scope_changes").update({ status, decided_at: new Date().toISOString(), decided_by_profile_id: actorId }).eq("id", changeId).eq("status", "proposed").select("*").single();
  if (error) throw error;
  if (data.project_item_id && data.change_type === "add_on") await supabase.from("project_items").update({ is_add_on: true, add_on_status: status }).eq("id", data.project_item_id);
  await logAuditEvent({ action: "project_scope_changes.decide", entityType: "project", entityId: data.project_id, performedByProfileId: actorId, oldValue: { status: "proposed" }, newValue: data as unknown as Json });
  refresh();
  return data;
}

export async function saveProjectTeamMember(projectId: string, profileId: string, teamRole: string, isLead: boolean, actorId: string) {
  const supabase = createAdminSupabaseClient();
  if (isLead) await supabase.from("project_team_members").update({ is_lead: false }).eq("project_id", projectId);
  const { data, error } = await supabase.from("project_team_members").upsert({ project_id: projectId, profile_id: profileId, team_role: clean(teamRole) ?? "worker", is_lead: isLead }).select("*").single();
  if (error) throw error;
  await logAuditEvent({ action: "project.team_member_saved", entityType: "project", entityId: projectId, performedByProfileId: actorId, newValue: data as unknown as Json });
  refresh();
  return data;
}

export async function removeProjectTeamMember(projectId: string, profileId: string, actorId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("project_team_members").delete().eq("project_id", projectId).eq("profile_id", profileId);
  if (error) throw error;
  await logAuditEvent({ action: "project.team_member_removed", entityType: "project", entityId: projectId, performedByProfileId: actorId, oldValue: { profileId } });
  refresh();
}
