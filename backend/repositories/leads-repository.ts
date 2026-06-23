// fetch/create/update lead records and lead status
import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export async function listLeads(): Promise<LeadRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getLeadById(leadId: string): Promise<LeadRow | null> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestLeadByThreadId(
  threadId: string,
): Promise<LeadRow | null> {
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
}

export async function createLead(payload: LeadInsert): Promise<LeadRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
