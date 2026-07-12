import "server-only";
import { resolveFinanceConfiguration } from "@/lib/crm/finance-configuration";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getFinanceConfiguration() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("app_settings").select("setting_key, value").in("setting_key", ["invoice_defaults", "payment_terms", "tax_settings"]);
  if (error) throw error;
  return resolveFinanceConfiguration(data ?? []);
}
