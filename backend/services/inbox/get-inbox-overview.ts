import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery } from "@/lib/cache/query-cache";
import { listRecentMessagesByThreadId } from "@/backend/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

function readExtractionObject(payload: Json) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function buildSuggestedReply(extractionPayload: Json): string {
  const extraction = readExtractionObject(extractionPayload);
  const customerName =
    typeof extraction.customerName === "string" ? extraction.customerName : "there";
  const issue =
    typeof extraction.issue === "string"
      ? extraction.issue
      : "your request";
  const siteVisitRequired = extraction.siteVisitRequired === true;
  const addressMissing = !(
    typeof extraction.address === "string" && extraction.address.trim().length > 0
  );

  const questions: string[] = [];

  if (addressMissing) {
    questions.push("share the unit address");
  }

  if (siteVisitRequired) {
    questions.push("confirm a suitable time for site visit");
  }

  const questionText =
    questions.length > 0
      ? `Could you please ${questions.join(" and ")}?`
      : "Could you confirm the next best time for us to proceed?";

  return `Hi ${customerName}, thanks for reaching out. We can help with ${issue}. ${questionText}`;
}

const activeReviewStatuses = new Set(["new", "ai_processed", "needs_review"]);

type InboxMediaAsset = {
  id: string;
  message_id: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  media_type: string | null;
  caption: string | null;
};

const getInboxOverviewCached = cachedQuery(
  ["inbox", "overview"],
  async (selectedThreadId: string | undefined, page: number = 1, pageSize: number = 50) => {
    const supabase = createAdminSupabaseClient();
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(pageSize, 20), 100);
    const rangeFrom = (safePage - 1) * safePageSize;

    const { data: threads, error, count } = await supabase
      .from("whatsapp_threads")
      .select(
        "id, contact_id, external_thread_id, thread_subject, last_message_at, is_archived, created_at, updated_at, contacts:contact_id(id, full_name, whatsapp_number, primary_phone, email)",
        { count: "exact" },
      )
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(rangeFrom, rangeFrom + safePageSize - 1);

    if (error) throw error;

    const threadList = threads ?? [];
    if (selectedThreadId && !threadList.some((thread) => thread.id === selectedThreadId)) {
      const { data: selectedThread, error: selectedThreadError } = await supabase
        .from("whatsapp_threads")
        .select("id, contact_id, external_thread_id, thread_subject, last_message_at, is_archived, created_at, updated_at, contacts:contact_id(id, full_name, whatsapp_number, primary_phone, email)")
        .eq("id", selectedThreadId)
        .eq("is_archived", false)
        .maybeSingle();
      if (selectedThreadError) throw selectedThreadError;
      if (selectedThread) threadList.unshift(selectedThread);
    }
    const threadIds = threadList.map((thread) => thread.id);
    const { data: threadReviewDrafts, error: threadReviewDraftsError } =
      threadIds.length > 0
        ? await supabase
            .from("review_drafts")
            .select("id, thread_id, status, updated_at")
            .in("thread_id", threadIds)
            .order("updated_at", { ascending: false })
        : { data: [], error: null };

    if (threadReviewDraftsError) throw threadReviewDraftsError;

    const reviewDraftsByThreadId = new Map<string, NonNullable<typeof threadReviewDrafts>[number]>();
    for (const draft of threadReviewDrafts ?? []) {
      if (draft.thread_id && !reviewDraftsByThreadId.has(draft.thread_id)) {
        reviewDraftsByThreadId.set(draft.thread_id, draft);
      }
    }
    const { data: linkedProjects, error: linkedProjectsError } =
      threadIds.length > 0
        ? await supabase
            .from("projects")
            .select("id, whatsapp_thread_id, project_code, title, status_code, completion_summary")
            .in("whatsapp_thread_id", threadIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };
    if (linkedProjectsError) throw linkedProjectsError;
    const projectsByThreadId = new Map<string, NonNullable<typeof linkedProjects>[number]>();
    for (const project of linkedProjects ?? []) {
      if (project.whatsapp_thread_id && !projectsByThreadId.has(project.whatsapp_thread_id)) {
        projectsByThreadId.set(project.whatsapp_thread_id, project);
      }
    }
    const activeThread =
      threadList.find((thread) => thread.id === selectedThreadId) ?? threadList[0] ?? null;

    if (!activeThread) {
      return {
        threads: [],
        reviewDraftsByThreadId: {},
        projectsByThreadId: {},
        activeThread: null,
        activeProject: null,
        messages: [],
        mediaByMessageId: {} as Record<string, InboxMediaAsset[]>,
        hasOlderMessages: false,
        reviewDraft: null,
        suggestedReply: "",
        pagination: { page: safePage, pageSize: safePageSize, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / safePageSize)) },
      };
    }

    const [messageResult, latestReviewDraftResult] = await Promise.all([
      listRecentMessagesByThreadId(activeThread.id, 200),
      supabase
        .from("review_drafts")
        .select("*")
        .eq("thread_id", activeThread.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (latestReviewDraftResult.error) throw latestReviewDraftResult.error;
    const reviewDraft = latestReviewDraftResult.data;
    const messageIds = messageResult.messages.map((message) => message.id);
    const { data: mediaAssets, error: mediaAssetsError } = messageIds.length
      ? await supabase
          .from("media_assets")
          .select("id, message_id, storage_bucket, storage_path, mime_type, media_type, caption")
          .in("message_id", messageIds)
      : { data: [], error: null };
    if (mediaAssetsError) throw mediaAssetsError;
    const mediaByMessageId: Record<string, InboxMediaAsset[]> = {};
    for (const asset of mediaAssets ?? []) {
      if (!asset.message_id) continue;
      const collection = mediaByMessageId[asset.message_id] ?? [];
      collection.push(asset);
      mediaByMessageId[asset.message_id] = collection;
    }

    return {
      threads: threadList,
      reviewDraftsByThreadId: Object.fromEntries(reviewDraftsByThreadId),
      projectsByThreadId: Object.fromEntries(projectsByThreadId),
      activeThread,
      activeProject: projectsByThreadId.get(activeThread.id) ?? null,
      messages: messageResult.messages,
      mediaByMessageId,
      hasOlderMessages: messageResult.hasOlderMessages,
      reviewDraft,
      suggestedReply: reviewDraft && activeReviewStatuses.has(reviewDraft.status)
        ? buildSuggestedReply(reviewDraft.extraction_payload)
        : "",
      pagination: { page: safePage, pageSize: safePageSize, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / safePageSize)) },
    };
  },
  8,
  [CACHE_TAGS.inbox, CACHE_TAGS.threads, CACHE_TAGS.messages, CACHE_TAGS.reviewDrafts],
);

export async function getInboxOverview(selectedThreadId?: string, page = 1) {
  const overview = await getInboxOverviewCached(selectedThreadId, page, 50);
  const mediaGroups = new Map<string, InboxMediaAsset[]>();

  for (const assets of Object.values(overview.mediaByMessageId)) {
    for (const asset of assets) {
      const group = mediaGroups.get(asset.storage_bucket) ?? [];
      group.push(asset);
      mediaGroups.set(asset.storage_bucket, group);
    }
  }

  const signedUrls = new Map<string, string>();
  const supabase = createAdminSupabaseClient();
  await Promise.all(
    Array.from(mediaGroups.entries()).map(async ([bucket, assets]) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(assets.map((asset) => asset.storage_path), 60 * 60);

      if (error) {
        console.error("[inbox.media_sign]", { bucket, error: error.message });
        return;
      }

      for (const [index, result] of (data ?? []).entries()) {
        const asset = assets[index];
        if (asset && result.signedUrl) signedUrls.set(asset.id, result.signedUrl);
      }
    }),
  );

  return {
    ...overview,
    mediaByMessageId: Object.fromEntries(
      Object.entries(overview.mediaByMessageId).map(([messageId, assets]) => [
        messageId,
        assets.map((asset) => ({
          ...asset,
          signed_url: signedUrls.get(asset.id) ?? null,
        })),
      ]),
    ),
  };
}
