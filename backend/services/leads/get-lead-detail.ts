import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getLeadDetail(leadId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      contacts:primary_contact_id (*),
      properties:primary_property_id (*),
      whatsapp_threads:whatsapp_thread_id (*)
    `,
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
