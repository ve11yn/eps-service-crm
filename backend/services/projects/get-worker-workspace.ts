import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type WorkerWorkspaceItem = {
  id: string;
  title: string;
  statusCode: string;
  priorityCode: string;
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
  } | null;
};

export async function getWorkerWorkspace(profileId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("project_items")
    .select(
      `
      id,
      title,
      status_code,
      priority_code,
      scheduled_start_at,
      scheduled_due_at,
      area_name,
      action_summary,
      projects:project_id (
        id,
        project_code,
        title,
        status_code,
        scheduled_start_at,
        scheduled_end_at
      )
    `,
    )
    .eq("assigned_profile_id", profileId)
    .order("scheduled_due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => {
    const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;

    return {
      id: item.id,
      title: item.title,
      statusCode: item.status_code,
      priorityCode: item.priority_code,
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
          }
        : null,
    } satisfies WorkerWorkspaceItem;
  });
}
