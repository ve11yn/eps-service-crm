import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery } from "@/lib/cache/query-cache";
import {
  getLatestActiveReviewDraftByThreadId,
  listMediaAssetsByProjectId,
  listMessagesByThreadId,
} from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const getProjectDetailCached = cachedQuery(
  ["projects", "detail"],
  async (projectId: string) => {
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

    const thread = Array.isArray(data.whatsapp_threads)
      ? data.whatsapp_threads[0]
      : data.whatsapp_threads;

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

    const [threadMessages, threadReviewDraft] = thread
      ? await Promise.all([
          listMessagesByThreadId(thread.id),
          getLatestActiveReviewDraftByThreadId(thread.id),
        ])
      : [[], null];

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
      inbox_preview: {
        thread,
        messages: threadMessages,
        review_draft: threadReviewDraft,
      },
    };
  },
  10,
  [
    CACHE_TAGS.projects,
    CACHE_TAGS.projectItems,
    CACHE_TAGS.mediaAssets,
    CACHE_TAGS.messages,
    CACHE_TAGS.reviewDrafts,
  ],
);

export async function getProjectDetail(projectId: string) {
  return getProjectDetailCached(projectId);
}
