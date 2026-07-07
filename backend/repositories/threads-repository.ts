// fetch/create/update WhatsApp thread records
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ThreadRow = Database["public"]["Tables"]["whatsapp_threads"]["Row"];
type ThreadInsert = Database["public"]["Tables"]["whatsapp_threads"]["Insert"];
type ThreadUpdate = Database["public"]["Tables"]["whatsapp_threads"]["Update"];

const getThreadByIdCached = cachedQuery(
  ["threads", "get-by-id"],
  async (threadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("whatsapp_threads")
      .select(
        "id, contact_id, external_thread_id, source_channel_code, thread_subject, last_message_at, latest_ai_summary, ai_last_summarized_at, is_archived, created_at, updated_at",
      )
      .eq("id", threadId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  15,
  [CACHE_TAGS.threads],
);

const getThreadByExternalThreadIdCached = cachedQuery(
  ["threads", "get-by-external-id"],
  async (externalThreadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("whatsapp_threads")
      .select(
        "id, contact_id, external_thread_id, source_channel_code, thread_subject, last_message_at, latest_ai_summary, ai_last_summarized_at, is_archived, created_at, updated_at",
      )
      .eq("external_thread_id", externalThreadId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  15,
  [CACHE_TAGS.threads],
);

export async function getThreadById(threadId: string): Promise<ThreadRow | null> {
  return getThreadByIdCached(threadId);
}

export async function getThreadByExternalThreadId(
  externalThreadId: string,
): Promise<ThreadRow | null> {
  return getThreadByExternalThreadIdCached(externalThreadId);
}

export async function createThread(payload: ThreadInsert): Promise<ThreadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_threads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.threads,
    CACHE_TAGS.messages,
    CACHE_TAGS.leads,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.inbox,
    CACHE_TAGS.reports,
  ]);
  return data;
}

export async function updateThread(
  threadId: string,
  payload: ThreadUpdate,
): Promise<ThreadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_threads")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function touchThreadActivity(
  threadId: string,
  lastMessageAt: string,
): Promise<ThreadRow> {
  return updateThread(threadId, {
    last_message_at: lastMessageAt,
  });
}

export async function archiveThread(threadId: string): Promise<ThreadRow> {
  return updateThread(threadId, {
    is_archived: true,
  });
}

export async function unarchiveThread(threadId: string): Promise<ThreadRow> {
  return updateThread(threadId, {
    is_archived: false,
  });
}
