import "server-only";

import { logAuditEvent } from "@/backend/observability/audit";
import { updateProject, updateProjectItem } from "@/backend/repositories";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/auth/roles";

export type WorkerUpdateType =
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "issue";

export type WorkerIssueType =
  | "customer_not_home"
  | "need_parts"
  | "safety_concern"
  | "scope_question"
  | "other";

const updateLabels: Record<Exclude<WorkerUpdateType, "issue">, string> = {
  on_the_way: "Worker is on the way",
  arrived: "Worker arrived on site",
  in_progress: "Work started",
  completed: "Work item completed",
};

const progressSequence: Array<Exclude<WorkerUpdateType, "issue">> = [
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
];

async function getWorkerItem(input: {
  itemId: string;
  profileId: string;
  roleCode: AppRole;
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("project_items")
    .select(
      `
      id,
      project_id,
      assigned_profile_id,
      title,
      status_code,
      before_after_required,
      projects:project_id (id, project_code, title, status_code)
    `,
    )
    .eq("id", input.itemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Assigned work item not found.");
  if (
    input.roleCode === "field_worker" &&
    data.assigned_profile_id !== input.profileId
  ) {
    throw new Error("This work item is not assigned to you.");
  }

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  if (!project) throw new Error("Work item project not found.");
  if (!["scheduled", "in_progress"].includes(project.status_code)) {
    throw new Error("This project is not open for field updates.");
  }

  return { ...data, project };
}

async function validateRequiredEvidence(item: {
  id: string;
  before_after_required: boolean;
}, requiredTypes: Array<"before" | "after">) {
  if (!item.before_after_required) return;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("evidence_type")
    .eq("project_item_id", item.id)
    .in("evidence_type", requiredTypes);

  if (error) throw error;
  const evidenceTypes = new Set((data ?? []).map((asset) => asset.evidence_type));
  const missing = requiredTypes.filter((type) => !evidenceTypes.has(type));
  if (missing.length > 0) {
    throw new Error(`Upload the required ${missing.join(" and ")} photo${missing.length === 1 ? "" : "s"} before continuing.`);
  }
}

async function validateProgressSequence(item: {
  id: string;
  status_code: string;
  before_after_required: boolean;
}, updateType: Exclude<WorkerUpdateType, "issue">) {
  if (item.status_code === "completed") {
    throw new Error("This work item is already complete.");
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("project_field_updates")
    .select("update_type")
    .eq("project_item_id", item.id)
    .in("update_type", progressSequence)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  let currentIndex = data ? progressSequence.indexOf(data.update_type as Exclude<WorkerUpdateType, "issue">) : -1;
  if (item.status_code === "in_progress") currentIndex = Math.max(currentIndex, 2);
  const expected = progressSequence[currentIndex + 1];

  if (!expected) throw new Error("No further progress update is available for this item.");
  if (updateType !== expected) {
    const label = updateLabels[expected].replace(/^Worker /, "");
    throw new Error(`Progress updates must be recorded in order. Next required update: ${label}.`);
  }

  if (updateType === "in_progress") {
    await validateRequiredEvidence(item, ["before"]);
  }
  if (updateType === "completed") {
    await validateRequiredEvidence(item, ["before", "after"]);
  }
}

async function advanceProjectIfNeeded(projectId: string, currentStatus: string, profileId: string) {
  const supabase = createAdminSupabaseClient();
  let projectStatus = currentStatus;

  if (projectStatus === "scheduled") {
    await updateProject(projectId, { status_code: "in_progress" });
    await logAuditEvent({ action: "projects.status_transition", entityType: "project", entityId: projectId, performedByProfileId: profileId, oldValue: { status_code: "scheduled" }, newValue: { status_code: "in_progress" }, metadata: { source: "worker_update" } });
    projectStatus = "in_progress";
  }

  const { data, error } = await supabase
    .from("project_items")
    .select("status_code")
    .eq("project_id", projectId);
  if (error) throw error;

  const allFinished =
    (data ?? []).length > 0 &&
    (data ?? []).every((item) => ["completed", "deferred"].includes(item.status_code));

  if (projectStatus === "in_progress" && allFinished) {
    await updateProject(projectId, {
      status_code: "qa_review",
      completion_summary: "All assigned work items are complete or deferred. Awaiting admin QA.",
    });
    await logAuditEvent({ action: "projects.status_transition", entityType: "project", entityId: projectId, performedByProfileId: profileId, oldValue: { status_code: "in_progress" }, newValue: { status_code: "qa_review" }, metadata: { source: "all_items_finished" } });
  }
}

export async function recordWorkerFieldUpdate(input: {
  itemId: string;
  profileId: string;
  roleCode: AppRole;
  updateType: WorkerUpdateType;
  issueType?: WorkerIssueType | null;
  notes?: string | null;
}) {
  const item = await getWorkerItem(input);
  const notes = input.notes?.trim() || null;

  if (input.updateType === "issue" && !input.issueType) {
    throw new Error("Choose an issue type.");
  }
  if (input.updateType === "issue" && !notes) {
    throw new Error("Describe the issue so admin can act on it.");
  }

  if (input.updateType !== "issue") {
    if (!notes || notes.length < 3) {
      throw new Error("Add a short site update before changing progress.");
    }
    await validateProgressSequence(item, input.updateType);
  }

  const supabase = createAdminSupabaseClient();
  const requiresAttention = input.updateType === "issue";
  const { data: fieldUpdate, error } = await supabase
    .from("project_field_updates")
    .insert({
      project_id: item.project_id,
      project_item_id: item.id,
      worker_profile_id: input.profileId,
      update_type: input.updateType,
      issue_type: input.updateType === "issue" ? input.issueType ?? null : null,
      notes,
      requires_attention: requiresAttention,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.updateType === "in_progress") {
    await updateProjectItem(item.id, {
      status_code: "in_progress",
      started_at: new Date().toISOString(),
    });
  } else if (input.updateType === "completed") {
    await updateProjectItem(item.id, {
      status_code: "completed",
      completed_at: new Date().toISOString(),
    });
  }

  const summary =
    input.updateType === "issue"
      ? `Issue: ${input.issueType?.replaceAll("_", " ")} - ${notes}`
      : `${updateLabels[input.updateType]}: ${item.title}${notes ? ` - ${notes}` : ""}`;

  await updateProject(item.project_id, { worker_update_summary: summary });

  if (["arrived", "in_progress", "completed"].includes(input.updateType)) {
    await advanceProjectIfNeeded(item.project_id, item.project.status_code, input.profileId);
  }

  invalidateCachedTags([
    CACHE_TAGS.fieldUpdates,
    CACHE_TAGS.projectItems,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);

  await logAuditEvent({
    action: `field_updates.${input.updateType}`,
    entityType: "project_item",
    entityId: item.id,
    performedByProfileId: input.profileId,
    oldValue: { status_code: item.status_code },
    newValue: { update_type: input.updateType, status_code: input.updateType === "completed" ? "completed" : input.updateType === "in_progress" ? "in_progress" : item.status_code, notes },
    metadata: {
      project_id: item.project_id,
      field_update_id: fieldUpdate.id,
      issue_type: input.issueType ?? null,
      requires_attention: requiresAttention,
    },
  });

  return fieldUpdate;
}

export async function authorizeWorkerEvidenceUpload(input: {
  itemId: string;
  profileId: string;
  roleCode: AppRole;
}) {
  return getWorkerItem(input);
}

export async function resolveFieldUpdate(input: {
  projectId: string;
  updateId: string;
  resolvedByProfileId: string;
  resolutionNotes?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("project_field_updates")
    .select("*")
    .eq("id", input.updateId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw new Error("Field update not found.");

  const { data, error } = await supabase
    .from("project_field_updates")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by_profile_id: input.resolvedByProfileId,
      resolution_notes: input.resolutionNotes?.trim() || null,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw error;

  invalidateCachedTags([CACHE_TAGS.fieldUpdates, CACHE_TAGS.projects, CACHE_TAGS.dashboard]);
  await logAuditEvent({
    action: "field_updates.resolve",
    entityType: "project_field_update",
    entityId: existing.id,
    performedByProfileId: input.resolvedByProfileId,
    oldValue: existing,
    newValue: data,
  });
  return data;
}
