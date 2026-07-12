import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { cachedQuery } from "@/lib/cache/query-cache";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";

const getProjectEditorOptionsCached = cachedQuery(
  ["projects", "editor-options"],
  async () => {
    const supabase = createAdminSupabaseClient();
    const [staffResult, contactsResult, propertiesResult] = await Promise.all([
      supabase.from("profiles").select("id, display_name, role_code").eq("is_active", true).order("display_name"),
      supabase.from("contacts").select("id, full_name").eq("is_archived", false).order("full_name"),
      supabase.from("properties").select("id, property_name, address_line_1, unit_no").eq("is_archived", false).order("address_line_1"),
    ]);
    if (staffResult.error) throw staffResult.error;
    if (contactsResult.error) throw contactsResult.error;
    if (propertiesResult.error) throw propertiesResult.error;
    return {
      staff: staffResult.data ?? [],
      contacts: contactsResult.data ?? [],
      properties: propertiesResult.data ?? [],
    };
  },
  60,
  [CACHE_TAGS.profiles, CACHE_TAGS.contacts, CACHE_TAGS.properties],
);

export async function getProjectEditorOptions() {
  return getProjectEditorOptionsCached();
}
