import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CoordinatorWorkspaceItem = {
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
  assignedProfile: {
    id: string;
    displayName: string;
  } | null;
  project: {
    id: string;
    projectCode: string;
    title: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    address: string | null;
  } | null;
};

export async function getCoordinatorWorkspace() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("project_items")
    .select(
      `
      id, title, description, status_code, priority_code, before_after_required,
      scheduled_start_at, scheduled_due_at, area_name, action_summary,
      assigned_profile:assigned_profile_id (id, display_name),
      projects:project_id (
        id, project_code, title, scheduled_start_at, scheduled_end_at,
        properties:primary_property_id (address_line_1, unit_no, postal_code)
      )
    `,
    )
    .in("status_code", ["pending", "in_progress"])
    .order("scheduled_start_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((item) => {
    const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
    const property = project
      ? Array.isArray(project.properties)
        ? project.properties[0]
        : project.properties
      : null;
    const assignedProfile = Array.isArray(item.assigned_profile)
      ? item.assigned_profile[0]
      : item.assigned_profile;
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
      assignedProfile: assignedProfile
        ? { id: assignedProfile.id, displayName: assignedProfile.display_name }
        : null,
      project: project
        ? {
            id: project.id,
            projectCode: project.project_code,
            title: project.title,
            scheduledStartAt: project.scheduled_start_at,
            scheduledEndAt: project.scheduled_end_at,
            address,
          }
        : null,
    } satisfies CoordinatorWorkspaceItem;
  });
}
