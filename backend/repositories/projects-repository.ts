// fetch/create/update project records and project status
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export async function getProjectById(projectId: string): Promise<ProjectRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createProject(payload: ProjectInsert): Promise<ProjectRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
