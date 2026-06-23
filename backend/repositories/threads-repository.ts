// fetch/create/update WhatsApp thread records
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ThreadRow = Database["public"]["Tables"]["whatsapp_threads"]["Row"];
type ThreadInsert = Database["public"]["Tables"]["whatsapp_threads"]["Insert"];
type ThreadUpdate = Database["public"]["Tables"]["whatsapp_threads"]["Update"];

export async function getThreadById(threadId: string): Promise<ThreadRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getThreadByExternalThreadId(
  externalThreadId: string,
): Promise<ThreadRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_threads")
    .select("*")
    .eq("external_thread_id", externalThreadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createThread(payload: ThreadInsert): Promise<ThreadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_threads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
