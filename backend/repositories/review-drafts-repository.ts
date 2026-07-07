import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ReviewDraftRow = Database["public"]["Tables"]["review_drafts"]["Row"];
type ReviewDraftInsert = Database["public"]["Tables"]["review_drafts"]["Insert"];
type ReviewDraftUpdate = Database["public"]["Tables"]["review_drafts"]["Update"];

const getReviewDraftByIdCached = cachedQuery(
  ["review-drafts", "get-by-id"],
  async (reviewDraftId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("review_drafts")
      .select("*")
      .eq("id", reviewDraftId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  15,
  [CACHE_TAGS.reviewDrafts],
);

const getLatestActiveReviewDraftByThreadIdCached = cachedQuery(
  ["review-drafts", "latest-active-by-thread"],
  async (threadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("review_drafts")
      .select("*")
      .eq("thread_id", threadId)
      .in("status", ["new", "ai_processed", "needs_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  10,
  [CACHE_TAGS.reviewDrafts],
);

const listReviewDraftsCached = cachedQuery(
  ["review-drafts", "list"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("review_drafts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  10,
  [CACHE_TAGS.reviewDrafts],
);

export async function getReviewDraftById(
  reviewDraftId: string,
): Promise<ReviewDraftRow | null> {
  return getReviewDraftByIdCached(reviewDraftId);
}

export async function getLatestActiveReviewDraftByThreadId(
  threadId: string,
): Promise<ReviewDraftRow | null> {
  return getLatestActiveReviewDraftByThreadIdCached(threadId);
}

export async function listReviewDrafts(): Promise<ReviewDraftRow[]> {
  return listReviewDraftsCached();
}

export async function createReviewDraft(
  payload: ReviewDraftInsert,
): Promise<ReviewDraftRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("review_drafts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.reviewDrafts, CACHE_TAGS.dashboard, CACHE_TAGS.requests, CACHE_TAGS.inbox]);
  return data;
}

export async function updateReviewDraft(
  reviewDraftId: string,
  payload: ReviewDraftUpdate,
): Promise<ReviewDraftRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("review_drafts")
    .update(payload)
    .eq("id", reviewDraftId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.reviewDrafts, CACHE_TAGS.dashboard, CACHE_TAGS.requests, CACHE_TAGS.inbox]);
  return data;
}
