import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { decryptWhatsAppToken } from "@/backend/integrations/whatsapp/token-encryption";
import type { Database } from "@/types/database";

type ConnectionRow = Database["public"]["Tables"]["whatsapp_connections"]["Row"];
type ConnectionInsert = Database["public"]["Tables"]["whatsapp_connections"]["Insert"];
type ConnectionUpdate = Database["public"]["Tables"]["whatsapp_connections"]["Update"];

export type ActiveWhatsAppConnection = Omit<
  ConnectionRow,
  "access_token_ciphertext"
> & {
  accessToken: string;
};

export async function getActiveWhatsAppConnectionRow(): Promise<ConnectionRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getActiveWhatsAppConnection(): Promise<ActiveWhatsAppConnection | null> {
  const connection = await getActiveWhatsAppConnectionRow();
  if (!connection) return null;

  const { access_token_ciphertext: encryptedToken, ...safeConnection } =
    connection;

  return {
    ...safeConnection,
    accessToken: decryptWhatsAppToken(encryptedToken),
  };
}

export async function saveActiveWhatsAppConnection(
  payload: ConnectionInsert,
): Promise<ConnectionRow> {
  const supabase = createAdminSupabaseClient();
  const { error: deactivateError } = await supabase
    .from("whatsapp_connections")
    .update({ is_active: false })
    .eq("is_active", true)
    .neq("phone_number_id", payload.phone_number_id);

  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .upsert(payload, { onConflict: "phone_number_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateWhatsAppConnection(
  connectionId: string,
  payload: ConnectionUpdate,
): Promise<ConnectionRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("whatsapp_connections")
    .update(payload)
    .eq("id", connectionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
