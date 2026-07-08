// fetch/create/update project records and project status
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
type ProjectListRow = Pick<
  ProjectRow,
  | "id"
  | "project_code"
  | "title"
  | "status_code"
  | "scheduled_start_at"
  | "scheduled_end_at"
  | "payment_due_at"
  | "updated_at"
  | "created_at"
>;

const getProjectByIdCached = cachedQuery(
  ["projects", "get-by-id"],
  async (projectId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  15,
  [CACHE_TAGS.projects],
);

const listProjectsCached = cachedQuery(
  ["projects", "list"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, project_code, title, status_code, scheduled_start_at, scheduled_end_at, payment_due_at, updated_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  10,
  [CACHE_TAGS.projects],
);

export async function getProjectById(projectId: string): Promise<ProjectRow | null> {
  return getProjectByIdCached(projectId);
}

export async function listProjects(): Promise<ProjectListRow[]> {
  return listProjectsCached();
}

export async function createProject(payload: ProjectInsert): Promise<ProjectRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
    CACHE_TAGS.inbox,
  ]);
  return data;
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdate,
): Promise<ProjectRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
    CACHE_TAGS.inbox,
  ]);
  return data;
}

export async function updateProjectStatus(
  projectId: string,
  statusCode: string,
): Promise<ProjectRow> {
  const completedAt = statusCode === "completed" ? new Date().toISOString() : null;

  return updateProject(projectId, {
    status_code: statusCode,
    completed_at: completedAt,
  });
}
