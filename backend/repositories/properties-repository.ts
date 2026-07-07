// fetch/create/update property records
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

const getPropertyByIdCached = cachedQuery(
  ["properties", "get-by-id"],
  async (propertyId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, property_name, address_line_1, address_line_2, unit_no, postal_code, country_code, landmark_notes, access_notes, created_at, updated_at",
      )
      .eq("id", propertyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.properties],
);

export async function getPropertyById(propertyId: string): Promise<PropertyRow | null> {
  return getPropertyByIdCached(propertyId);
}

export async function createProperty(payload: PropertyInsert): Promise<PropertyRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.properties, CACHE_TAGS.projects, CACHE_TAGS.requests, CACHE_TAGS.inbox]);
  return data;
}

export async function updateProperty(
  propertyId: string,
  payload: PropertyUpdate,
): Promise<PropertyRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("properties")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.properties, CACHE_TAGS.projects, CACHE_TAGS.requests, CACHE_TAGS.inbox]);
  return data;
}
