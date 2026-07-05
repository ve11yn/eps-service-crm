import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];
type MediaAssetInsert = Database["public"]["Tables"]["media_assets"]["Insert"];
type MediaAssetUpdate = Database["public"]["Tables"]["media_assets"]["Update"];

export async function createMediaAsset(
  payload: MediaAssetInsert,
): Promise<MediaAssetRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("media_assets")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMediaAsset(
  mediaAssetId: string,
  payload: MediaAssetUpdate,
): Promise<MediaAssetRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("media_assets")
    .update(payload)
    .eq("id", mediaAssetId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMediaAssetsByProjectId(
  projectId: string,
): Promise<MediaAssetRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
