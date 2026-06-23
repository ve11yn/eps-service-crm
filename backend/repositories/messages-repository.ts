// fetch/create inbound/outbound message records
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export async function getMessageByExternalMessageId(
  externalMessageId: string,
): Promise<MessageRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listMessagesByThreadId(
  threadId: string,
): Promise<MessageRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createMessage(payload: MessageInsert): Promise<MessageRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
