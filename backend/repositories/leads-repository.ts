// fetch/create/update lead records and lead status
import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { cachedQuery, invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

const listLeadsCached = cachedQuery(
  ["leads", "list"],
  async () => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  10,
  [CACHE_TAGS.leads],
);

const getLeadByIdCached = cachedQuery(
  ["leads", "get-by-id"],
  async (leadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  15,
  [CACHE_TAGS.leads],
);

const getLatestLeadByThreadIdCached = cachedQuery(
  ["leads", "latest-by-thread"],
  async (threadId: string) => {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("whatsapp_thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  10,
  [CACHE_TAGS.leads],
);

export async function listLeads(): Promise<LeadRow[]> {
  return listLeadsCached();
}

export async function getLeadById(leadId: string): Promise<LeadRow | null> {
  return getLeadByIdCached(leadId);
}

export async function getLatestLeadByThreadId(
  threadId: string,
): Promise<LeadRow | null> {
  return getLatestLeadByThreadIdCached(threadId);
}

export async function createLead(payload: LeadInsert): Promise<LeadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.leads,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
    CACHE_TAGS.inbox,
  ]);
  return data;
}

export async function updateLead(
  leadId: string,
  payload: LeadUpdate,
): Promise<LeadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadStatus(
  leadId: string,
  statusCode: string,
): Promise<LeadRow> {
  return updateLead(leadId, {
    status_code: statusCode,
    last_activity_at: new Date().toISOString(),
  });
}
