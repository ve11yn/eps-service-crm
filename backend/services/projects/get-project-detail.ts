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
        worker_update_summary,
        completion_summary,
        qa_status,
        qa_reviewed_at,
        qa_reviewed_by_profile_id,
        qa_notes,
        customer_signoff_status,
        customer_signed_at,
        customer_signed_by_name,
        warranty_starts_at,
        review_request_generated_at,
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
          id, project_id, title, description, area_name, action_summary, quoted_amount, priority_code,
          assigned_profile_id, before_after_required, scheduled_start_at, scheduled_due_at,
          item_group, item_type, is_add_on, add_on_status, is_pi, is_checklist_item, checklist_requirements,
          customer_note, internal_note, actual_cost, labour_cost, material_cost, is_deferred, deferred_reason,
          sort_order, status_code, created_at, updated_at, started_at, completed_at,
          assigned_profile:assigned_profile_id (id, display_name),
          project_item_events (id, event_type, reason, old_value, new_value, created_at, created_by_profile_id)
        ),
        project_scope_changes (
          id, project_id, project_item_id, change_type, status, description, amount_delta,
          requested_by, decided_at, created_at,
          created_by_profile:created_by_profile_id (id, display_name),
          decided_by_profile:decided_by_profile_id (id, display_name)
        ),
        project_team_members (
          profile_id, team_role, is_lead, created_at,
          profile:profile_id (id, display_name, role_code, phone)
        ),
        project_field_updates (
          id, project_id, project_item_id, update_type, issue_type, notes, requires_attention,
          resolved_at, resolution_notes, created_at,
          worker_profile:worker_profile_id (id, display_name),
          resolved_by_profile:resolved_by_profile_id (id, display_name)
        ),
        invoices (id, invoice_number, status_code, total_amount, balance_due_amount, due_at, paid_at),
        payments (id, invoice_id, status_code, amount, verified_at)
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
      ? [...data.project_items].sort((a, b) => a.sort_order - b.sort_order).map((item) => ({
          ...item,
          project_item_events: Array.isArray(item.project_item_events)
            ? [...item.project_item_events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            : item.project_item_events,
          media_assets: mediaAssetsWithUrls.filter(
            (asset) => asset.project_item_id === item.id,
          ),
        }))
      : data.project_items;

    return {
      ...data,
      project_items: projectItems,
      project_field_updates: Array.isArray(data.project_field_updates)
        ? [...data.project_field_updates].sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          )
        : data.project_field_updates,
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
    CACHE_TAGS.fieldUpdates,
  ],
);

export async function getProjectDetail(projectId: string) {
  return getProjectDetailCached(projectId);
}
