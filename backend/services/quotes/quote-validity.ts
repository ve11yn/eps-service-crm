import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getQuoteValidityDays() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("app_settings").select("value").eq("setting_key", "quote_defaults").maybeSingle();
  if (error) throw error;
  const value = data?.value;
  const days = value && typeof value === "object" && !Array.isArray(value) && "validity_days" in value
    ? Number(value.validity_days)
    : 14;
  return Number.isFinite(days) && days > 0 ? Math.min(Math.round(days), 365) : 14;
}

export async function createQuoteValidUntil(from = new Date()) {
  const validUntil = new Date(from);
  validUntil.setUTCDate(validUntil.getUTCDate() + await getQuoteValidityDays());
  return validUntil.toISOString();
}
