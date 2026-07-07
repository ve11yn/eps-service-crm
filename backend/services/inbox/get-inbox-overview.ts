import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery } from "@/lib/cache/query-cache";
import { getLatestActiveReviewDraftByThreadId, listMessagesByThreadId } from "@/backend/repositories";
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
  async (selectedThreadId?: string) => {
    const supabase = createAdminSupabaseClient();

    const { data: threads, error } = await supabase
      .from("whatsapp_threads")
      .select(
        "id, contact_id, external_thread_id, thread_subject, last_message_at, is_archived, created_at, updated_at, contacts:contact_id(id, full_name, whatsapp_number, primary_phone, email)",
      )
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const threadList = threads ?? [];
    const activeThread =
      threadList.find((thread) => thread.id === selectedThreadId) ?? threadList[0] ?? null;

    if (!activeThread) {
      return {
        threads: [],
        activeThread: null,
        messages: [],
        reviewDraft: null,
        suggestedReply: "",
      };
    }

    const [messages, reviewDraft] = await Promise.all([
      listMessagesByThreadId(activeThread.id),
      getLatestActiveReviewDraftByThreadId(activeThread.id),
    ]);

    return {
      threads: threadList,
      activeThread,
      messages,
      reviewDraft,
      suggestedReply: reviewDraft
        ? buildSuggestedReply(reviewDraft.extraction_payload)
        : "",
    };
  },
  8,
  [CACHE_TAGS.inbox, CACHE_TAGS.threads, CACHE_TAGS.messages, CACHE_TAGS.reviewDrafts],
);

export async function getInboxOverview(selectedThreadId?: string) {
  return getInboxOverviewCached(selectedThreadId);
}
