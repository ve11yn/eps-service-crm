import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function getProfileById(profileId: string): Promise<ProfileRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfileByUsername(
  username: string,
): Promise<ProfileRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listProfiles(): Promise<ProfileRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function countProfiles(): Promise<number> {
  const supabase = createAdminSupabaseClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function updateProfile(
  profileId: string,
  payload: ProfileUpdate,
): Promise<ProfileRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
