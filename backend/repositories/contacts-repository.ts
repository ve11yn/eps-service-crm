// fetch/create/update contact records
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

export async function getContactById(contactId: string): Promise<ContactRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getContactByWhatsAppNumber(
  whatsappNumber: string,
): Promise<ContactRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createContact(payload: ContactInsert): Promise<ContactRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
  return data;
}
