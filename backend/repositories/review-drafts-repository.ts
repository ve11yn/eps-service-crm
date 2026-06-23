import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ReviewDraftRow = Database["public"]["Tables"]["review_drafts"]["Row"];
type ReviewDraftInsert = Database["public"]["Tables"]["review_drafts"]["Insert"];
type ReviewDraftUpdate = Database["public"]["Tables"]["review_drafts"]["Update"];

export async function getReviewDraftById(
  reviewDraftId: string,
): Promise<ReviewDraftRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("review_drafts")
    .select("*")
    .eq("id", reviewDraftId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestActiveReviewDraftByThreadId(
  threadId: string,
): Promise<ReviewDraftRow | null> {
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
}

export async function listReviewDrafts(): Promise<ReviewDraftRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("review_drafts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
  return data;
}
