import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type WorkerWorkspaceItem = {
  id: string;
  title: string;
  description: string | null;
  statusCode: string;
  priorityCode: string;
  beforeAfterRequired: boolean;
  scheduledStartAt: string | null;
  scheduledDueAt: string | null;
  areaName: string | null;
  actionSummary: string | null;
  project: {
    id: string;
    projectCode: string;
    title: string;
    statusCode: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    address: string | null;
  } | null;
  evidence: Array<{
    id: string;
    evidenceType: string | null;
    caption: string | null;
    signedUrl: string | null;
    createdAt: string;
  }>;
  recentUpdates: Array<{
    id: string;
    updateType: string;
    issueType: string | null;
    notes: string | null;
    requiresAttention: boolean;
    resolvedAt: string | null;
    createdAt: string;
  }>;
};

export async function getWorkerWorkspace(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("project_items")
    .select(
      `
      id, title, description, status_code, priority_code, before_after_required,
      scheduled_start_at, scheduled_due_at, area_name, action_summary,
      projects:project_id (
        id, project_code, title, status_code, scheduled_start_at, scheduled_end_at,
        properties:primary_property_id (address_line_1, unit_no, postal_code)
      )
    `,
    )
    .eq("assigned_profile_id", profileId)
    .in("status_code", ["pending", "in_progress"])
    .order("scheduled_due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  const rows = data ?? [];
  const itemIds = rows.map((item) => item.id);
  const [mediaResult, updatesResult] = itemIds.length
    ? await Promise.all([
        supabase
          .from("media_assets")
          .select("id, project_item_id, storage_bucket, storage_path, evidence_type, caption, created_at")
          .in("project_item_id", itemIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_field_updates")
          .select("id, project_item_id, update_type, issue_type, notes, requires_attention, resolved_at, created_at")
          .in("project_item_id", itemIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (mediaResult.error) throw mediaResult.error;
  if (updatesResult.error) throw updatesResult.error;

  const evidenceWithUrls = await Promise.all(
    (mediaResult.data ?? []).map(async (asset) => {
      const { data: signed } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      return { ...asset, signedUrl: signed?.signedUrl ?? null };
    }),
  );

  return rows.map((item) => {
    const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
    const property = project
      ? Array.isArray(project.properties)
        ? project.properties[0]
        : project.properties
      : null;
    const address = property
      ? [property.address_line_1, property.unit_no, property.postal_code].filter(Boolean).join(", ")
      : null;

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      statusCode: item.status_code,
      priorityCode: item.priority_code,
      beforeAfterRequired: item.before_after_required,
      scheduledStartAt: item.scheduled_start_at,
      scheduledDueAt: item.scheduled_due_at,
      areaName: item.area_name,
      actionSummary: item.action_summary,
      project: project
        ? {
            id: project.id,
            projectCode: project.project_code,
            title: project.title,
            statusCode: project.status_code,
            scheduledStartAt: project.scheduled_start_at,
            scheduledEndAt: project.scheduled_end_at,
            address,
          }
        : null,
      evidence: evidenceWithUrls
        .filter((asset) => asset.project_item_id === item.id)
        .map((asset) => ({
          id: asset.id,
          evidenceType: asset.evidence_type,
          caption: asset.caption,
          signedUrl: asset.signedUrl,
          createdAt: asset.created_at,
        })),
      recentUpdates: (updatesResult.data ?? [])
        .filter((update) => update.project_item_id === item.id)
        .slice(0, 8)
        .map((update) => ({
          id: update.id,
          updateType: update.update_type,
          issueType: update.issue_type,
          notes: update.notes,
          requiresAttention: update.requires_attention,
          resolvedAt: update.resolved_at,
          createdAt: update.created_at,
        })),
    } satisfies WorkerWorkspaceItem;
  });
}
