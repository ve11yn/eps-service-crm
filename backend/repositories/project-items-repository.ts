// fetch/create/update project work items and item status
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ProjectItemRow = Database["public"]["Tables"]["project_items"]["Row"];
type ProjectItemInsert = Database["public"]["Tables"]["project_items"]["Insert"];
type ProjectItemUpdate = Database["public"]["Tables"]["project_items"]["Update"];

export async function getProjectItemById(itemId: string): Promise<ProjectItemRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("project_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listProjectItemsByProjectId(
  projectId: string,
): Promise<ProjectItemRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("project_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createProjectItem(
  payload: ProjectItemInsert,
): Promise<ProjectItemRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("project_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectItem(
  itemId: string,
  payload: ProjectItemUpdate,
): Promise<ProjectItemRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("project_items")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectItemStatus(
  itemId: string,
  statusCode: string,
): Promise<ProjectItemRow> {
  return updateProjectItem(itemId, {
    status_code: statusCode,
    completed_at: statusCode === "completed" ? new Date().toISOString() : null,
  });
}

export async function deleteProjectItem(itemId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("project_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
