import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const getProfileByIdCached = cachedQuery(
  ["profiles", "get-by-id"],
  async (profileId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.profiles],
);

const getProfileByUsernameCached = cachedQuery(
  ["profiles", "get-by-username"],
  async (username: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  30,
  [CACHE_TAGS.profiles],
);

const listProfilesCached = cachedQuery(
  ["profiles", "list"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  30,
  [CACHE_TAGS.profiles],
);

const countProfilesCached = cachedQuery(
  ["profiles", "count"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return count ?? 0;
  },
  30,
  [CACHE_TAGS.profiles],
);

export async function getProfileById(profileId: string): Promise<ProfileRow | null> {
  return getProfileByIdCached(profileId);
}

export async function getProfileByUsername(
  username: string,
): Promise<ProfileRow | null> {
  return getProfileByUsernameCached(username);
}

export async function listProfiles(): Promise<ProfileRow[]> {
  return listProfilesCached();
}

export async function countProfiles(): Promise<number> {
  return countProfilesCached();
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
  invalidateCachedTags([CACHE_TAGS.profiles]);
  return data;
}
