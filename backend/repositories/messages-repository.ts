// fetch/create inbound/outbound message records
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
type MessageListRow = Pick<
  MessageRow,
  | "id"
  | "thread_id"
  | "direction_code"
  | "message_type_code"
  | "sender_name"
  | "sender_phone"
  | "content"
  | "media_caption"
  | "provider_payload"
  | "sent_at"
  | "created_at"
>;

const getMessageByExternalMessageIdCached = cachedQuery(
  ["messages", "get-by-external-id"],
  async (externalMessageId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("external_message_id", externalMessageId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.messages],
);

const listMessagesByThreadIdCached = cachedQuery(
  ["messages", "list-by-thread"],
  async (threadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("messages")
      .select("id, thread_id, direction_code, message_type_code, sender_name, sender_phone, content, media_caption, provider_payload, sent_at, created_at")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },
  10,
  [CACHE_TAGS.messages],
);

const listRecentMessagesByThreadIdCached = cachedQuery(
  ["messages", "recent-by-thread"],
  async (threadId: string, limit: number) => {
    const supabase = createAdminSupabaseClient();
    const safeLimit = Math.min(Math.max(limit, 20), 500);
    const { data, error } = await supabase
      .from("messages")
      .select("id, thread_id, direction_code, message_type_code, sender_name, sender_phone, content, media_caption, provider_payload, sent_at, created_at")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: false })
      .limit(safeLimit + 1);
    if (error) throw error;
    const rows = data ?? [];
    return {
      messages: rows.slice(0, safeLimit).reverse(),
      hasOlderMessages: rows.length > safeLimit,
    };
  },
  10,
  [CACHE_TAGS.messages],
);

export async function getMessageByExternalMessageId(
  externalMessageId: string,
): Promise<MessageRow | null> {
  return getMessageByExternalMessageIdCached(externalMessageId);
}

export async function listMessagesByThreadId(
  threadId: string,
): Promise<MessageListRow[]> {
  return listMessagesByThreadIdCached(threadId);
}

export async function listRecentMessagesByThreadId(threadId: string, limit = 200) {
  return listRecentMessagesByThreadIdCached(threadId, limit);
}

export async function createMessage(payload: MessageInsert): Promise<MessageRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.messages,
    CACHE_TAGS.threads,
    CACHE_TAGS.leads,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.inbox,
    CACHE_TAGS.reports,
  ]);
  return data;
}
