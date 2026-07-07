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
        id,
        project_code,
        title,
        source_lead_id,
        source_channel_code,
        status_code,
        primary_contact_id,
        primary_property_id,
        whatsapp_thread_id,
        scope_summary,
        remarks,
        enquiry_at,
        scheduled_start_at,
        scheduled_end_at,
        handover_at,
        payment_due_at,
        payment_follow_up_at,
        warranty_expires_at,
        created_at,
        updated_at,
        contacts:primary_contact_id (
          id, full_name, whatsapp_number, primary_phone, email, notes, created_at, updated_at
        ),
        properties:primary_property_id (
          id, property_name, address_line_1, address_line_2, unit_no, postal_code, access_notes, created_at, updated_at
        ),
        whatsapp_threads:whatsapp_thread_id (
          id, contact_id, external_thread_id, thread_subject, last_message_at, is_archived, created_at, updated_at
        ),
        project_items (
          id, project_id, title, description, area_name, action_summary, quoted_amount, priority_code, item_group, item_type, is_add_on, is_pi, is_checklist_item, sort_order, status_code, created_at, updated_at, completed_at
        )
      `,
      )
      .eq("id", projectId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const thread = Array.isArray(data.whatsapp_threads)
      ? data.whatsapp_threads[0]
      : data.whatsapp_threads;

    const mediaAssetsPromise = listMediaAssetsByProjectId(projectId);
    const threadDataPromise = thread
      ? Promise.all([
          listMessagesByThreadId(thread.id),
          getLatestActiveReviewDraftByThreadId(thread.id),
        ])
      : Promise.resolve<[Awaited<ReturnType<typeof listMessagesByThreadId>>, Awaited<ReturnType<typeof getLatestActiveReviewDraftByThreadId>>]>([
          [],
          null,
        ]);

    const [mediaAssets, [threadMessages, threadReviewDraft]] = await Promise.all([
      mediaAssetsPromise,
      threadDataPromise,
    ]);

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
