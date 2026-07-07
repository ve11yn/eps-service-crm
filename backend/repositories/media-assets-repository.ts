import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];
type MediaAssetInsert = Database["public"]["Tables"]["media_assets"]["Insert"];
type MediaAssetUpdate = Database["public"]["Tables"]["media_assets"]["Update"];

const listMediaAssetsByProjectIdCached = cachedQuery(
  ["media-assets", "list-by-project"],
  async (projectId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },
  10,
  [CACHE_TAGS.mediaAssets],
);

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
  invalidateCachedTags([
    CACHE_TAGS.mediaAssets,
    CACHE_TAGS.projectItems,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);
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
  invalidateCachedTags([
    CACHE_TAGS.mediaAssets,
    CACHE_TAGS.projectItems,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);
  return data;
}

export async function listMediaAssetsByProjectId(
  projectId: string,
): Promise<MediaAssetRow[]> {
  return listMediaAssetsByProjectIdCached(projectId);
}
