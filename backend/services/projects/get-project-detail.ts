import "server-only";

import { listMediaAssetsByProjectId } from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getProjectDetail(projectId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      contacts:primary_contact_id (*),
      properties:primary_property_id (*),
      whatsapp_threads:whatsapp_thread_id (*),
      project_items (*)
    `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const mediaAssets = await listMediaAssetsByProjectId(projectId);
  const mediaAssetsWithUrls = await Promise.all(
    mediaAssets.map(async (asset) => {
      const { data: signedUrlData } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);

      return {
        ...asset,
        signed_url: signedUrlData?.signedUrl ?? null,
      };
    }),
  );

  const projectItems = Array.isArray(data.project_items)
    ? data.project_items.map((item) => ({
        ...item,
        media_assets: mediaAssetsWithUrls.filter(
          (asset) => asset.project_item_id === item.id,
        ),
      }))
    : data.project_items;

  return {
    ...data,
    project_items: projectItems,
    media_assets: mediaAssetsWithUrls,
  };
}
