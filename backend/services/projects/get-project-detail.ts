import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getProjectDetail(projectId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      contacts:primary_contact_id (*),
      properties:primary_property_id (*),
      whatsapp_threads:whatsapp_thread_id (*),
      project_items (*)
    `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
