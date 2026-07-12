import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery } from "@/lib/cache/query-cache";
import { getLatestActiveReviewDraftByThreadId, listRecentMessagesByThreadId } from "@/backend/repositories";
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
            .in("status", ["new", "ai_processed", "needs_review"])
            .order("updated_at", { ascending: false })
        : { data: [], error: null };

    if (threadReviewDraftsError) throw threadReviewDraftsError;

    const reviewDraftsByThreadId = new Map(
      (threadReviewDrafts ?? [])
        .filter((draft) => draft.thread_id)
        .map((draft) => [draft.thread_id, draft]),
    );
    const activeThread =
      threadList.find((thread) => thread.id === selectedThreadId) ?? threadList[0] ?? null;

    if (!activeThread) {
      return {
        threads: [],
        reviewDraftsByThreadId: {},
        activeThread: null,
        messages: [],
        hasOlderMessages: false,
        reviewDraft: null,
        suggestedReply: "",
        pagination: { page: safePage, pageSize: safePageSize, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / safePageSize)) },
      };
    }

    const [messageResult, reviewDraft] = await Promise.all([
      listRecentMessagesByThreadId(activeThread.id, 200),
      getLatestActiveReviewDraftByThreadId(activeThread.id),
    ]);

    return {
      threads: threadList,
      reviewDraftsByThreadId: Object.fromEntries(reviewDraftsByThreadId),
      activeThread,
      messages: messageResult.messages,
      hasOlderMessages: messageResult.hasOlderMessages,
      reviewDraft,
      suggestedReply: reviewDraft
        ? buildSuggestedReply(reviewDraft.extraction_payload)
        : "",
      pagination: { page: safePage, pageSize: safePageSize, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / safePageSize)) },
    };
  },
  8,
  [CACHE_TAGS.inbox, CACHE_TAGS.threads, CACHE_TAGS.messages, CACHE_TAGS.reviewDrafts],
);

export async function getInboxOverview(selectedThreadId?: string, page = 1) {
  return getInboxOverviewCached(selectedThreadId, page, 50);
}
