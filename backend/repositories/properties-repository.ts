// fetch/create/update property records
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

export async function getPropertyById(propertyId: string): Promise<PropertyRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProperty(payload: PropertyInsert): Promise<PropertyRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
  return data;
}
