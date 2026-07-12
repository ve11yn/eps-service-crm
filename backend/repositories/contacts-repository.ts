// fetch/create/update contact records
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

const getContactByIdCached = cachedQuery(
  ["contacts", "get-by-id"],
  async (contactId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("contacts")
      .select("id, full_name, whatsapp_number, primary_phone, email, notes, is_archived, archived_at, merged_into_contact_id, created_at, updated_at")
      .eq("id", contactId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.contacts],
);

const listContactsCached = cachedQuery(
  ["contacts", "list"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("contacts")
      .select("id, full_name, whatsapp_number, primary_phone, email, notes, is_archived, archived_at, merged_into_contact_id, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  30,
  [CACHE_TAGS.contacts],
);

const getContactByWhatsAppNumberCached = cachedQuery(
  ["contacts", "get-by-whatsapp"],
  async (whatsappNumber: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("contacts")
      .select("id, full_name, whatsapp_number, primary_phone, email, notes, is_archived, archived_at, merged_into_contact_id, created_at, updated_at")
      .eq("whatsapp_number", whatsappNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.contacts],
);

export async function getContactById(contactId: string): Promise<ContactRow | null> {
  return getContactByIdCached(contactId);
}

export async function listContacts(): Promise<ContactRow[]> {
  return listContactsCached();
}

export async function getContactByWhatsAppNumber(
  whatsappNumber: string,
): Promise<ContactRow | null> {
  return getContactByWhatsAppNumberCached(whatsappNumber);
}

export async function createContact(payload: ContactInsert): Promise<ContactRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.contacts, CACHE_TAGS.threads, CACHE_TAGS.inbox]);
  return data;
}

export async function updateContact(
  contactId: string,
  payload: ContactUpdate,
): Promise<ContactRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.contacts, CACHE_TAGS.threads, CACHE_TAGS.inbox]);
  return data;
}
