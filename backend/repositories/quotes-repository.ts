import "server-only";

import { CACHE_TAGS } from "@/lib/cache/cache-tags";
import { invalidateCachedTags } from "@/lib/cache/query-cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
export type QuoteItemRow = Database["public"]["Tables"]["quote_items"]["Row"];
type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];
type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];
type QuoteItemUpdate = Database["public"]["Tables"]["quote_items"]["Update"];

const quoteSelect = `
  *,
  leads:lead_id (*),
  projects:project_id (*),
  quote_items (*)
`;

export async function listQuotes() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      lead_id,
      project_id,
      quote_number,
      version_number,
      status_code,
      total_amount,
      sent_at,
      approved_at,
      expired_at,
      rejected_at,
      created_at,
      updated_at,
      leads:lead_id (id, lead_code, title, primary_contact_id, primary_property_id, whatsapp_thread_id)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listQuotesByLeadId(leadId: string): Promise<QuoteRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("lead_id", leadId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getQuoteDetail(quoteId: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .select(quoteSelect)
    .eq("id", quoteId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createQuote(payload: QuoteInsert): Promise<QuoteRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.leads,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);
  return data;
}

export async function createQuoteItem(
  payload: QuoteItemInsert,
): Promise<QuoteItemRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quote_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.leads, CACHE_TAGS.projects]);
  return data;
}

export async function updateQuote(
  quoteId: string,
  payload: QuoteUpdate,
): Promise<QuoteRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([
    CACHE_TAGS.leads,
    CACHE_TAGS.projects,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.requests,
    CACHE_TAGS.reports,
  ]);
  return data;
}

export async function updateQuoteItem(
  quoteItemId: string,
  payload: QuoteItemUpdate,
): Promise<QuoteItemRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("quote_items")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteItemId)
    .select("*")
    .single();

  if (error) throw error;
  invalidateCachedTags([CACHE_TAGS.projects]);
  return data;
}
