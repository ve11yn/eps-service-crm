import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";

type CountQuery = PromiseLike<{
  count: number | null;
  error: PostgrestError | null;
}>;

type DataQuery<T> = PromiseLike<{
  data: T | null;
  error: PostgrestError | null;
}>;

type SettingsQueryResult<T> = {
  data: T | null;
  error: string | null;
};

type LatestPricingItem = {
  catalog_id: string;
  service_title: string;
  updated_at: string;
};

type LatestPricingCatalog = {
  code: string;
  service_domain: string;
};

function formatSettingsError(label: string, error: PostgrestError) {
  return `${label}: ${error.message || error.code || "query failed"}`;
}

async function getCount(label: string, query: CountQuery): Promise<SettingsQueryResult<number>> {
  const result = await query;

  if (result.error) {
    return {
      data: 0,
      error: formatSettingsError(label, result.error),
    };
  }

  return {
    data: result.count ?? 0,
    error: null,
  };
}

async function getMaybeSingle<T>(
  label: string,
  query: DataQuery<T>,
): Promise<SettingsQueryResult<T>> {
  const result = await query;

  if (result.error) {
    return {
      data: null,
      error: formatSettingsError(label, result.error),
    };
  }

  return {
    data: result.data,
    error: null,
  };
}

export async function getSettingsOverview() {
  const supabase = createAdminSupabaseClient();

  const [
    catalogCount,
    activePricingItemCount,
    latestPricingItem,
    threadCount,
    messageCount,
    roleCount,
    profileCount,
    auditLogCount,
    errorLogCount,
  ] = await Promise.all([
    getCount(
      "pricing catalogs",
      supabase
        .from("pricing_catalogs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ),
    getCount(
      "pricing items",
      supabase
        .from("pricing_items")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ),
    getMaybeSingle<LatestPricingItem>(
      "latest pricing item",
      supabase
        .from("pricing_items")
        .select("catalog_id, service_title, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    getCount(
      "WhatsApp threads",
      supabase.from("whatsapp_threads").select("id", {
        count: "exact",
        head: true,
      }),
    ),
    getCount(
      "messages",
      supabase.from("messages").select("id", { count: "exact", head: true }),
    ),
    getCount(
      "roles",
      supabase
        .from("user_roles")
        .select("code", { count: "exact", head: true })
        .eq("is_active", true),
    ),
    getCount(
      "profiles",
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ),
    getCount(
      "audit logs",
      supabase.from("audit_logs").select("id", {
        count: "exact",
        head: true,
      }),
    ),
    getCount(
      "system error logs",
      supabase
        .from("system_error_logs")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null),
    ),
  ]);

  const latestCatalog = latestPricingItem.data
    ? await getMaybeSingle<LatestPricingCatalog>(
        "latest pricing catalog",
        supabase
          .from("pricing_catalogs")
          .select("code, service_domain")
          .eq("id", latestPricingItem.data.catalog_id)
          .maybeSingle(),
      )
    : { data: null, error: null };

  const queryErrors = [
    catalogCount.error,
    activePricingItemCount.error,
    latestPricingItem.error,
    latestCatalog.error,
    threadCount.error,
    messageCount.error,
    roleCount.error,
    profileCount.error,
    auditLogCount.error,
    errorLogCount.error,
  ].filter((error): error is string => Boolean(error));

  return {
    queryErrors,
    serviceCatalog: {
      activeCatalogs: catalogCount.data ?? 0,
      activePricingItems: activePricingItemCount.data ?? 0,
      latestItemTitle: latestPricingItem.data?.service_title ?? null,
      latestCatalogCode: latestCatalog.data?.code ?? null,
      latestServiceDomain: latestCatalog.data?.service_domain ?? null,
    },
    whatsapp: {
      configured:
        ((Boolean(serverEnv.whatsappAccessToken) &&
          Boolean(serverEnv.whatsappPhoneNumberId)) ||
          Boolean(serverEnv.whatsappTokenEncryptionKey)) &&
        Boolean(serverEnv.whatsappWebhookVerifyToken),
      hasSignatureSecret: Boolean(
        serverEnv.whatsappWebhookSignatureSecret || serverEnv.metaAppSecret,
      ),
      threadCount: threadCount.data ?? 0,
      messageCount: messageCount.data ?? 0,
    },
    access: {
      activeRoles: roleCount.data ?? 0,
      activeProfiles: profileCount.data ?? 0,
    },
    ownership: {
      auditLogCount: auditLogCount.data ?? 0,
      unresolvedErrorCount: errorLogCount.data ?? 0,
      supabaseConfigured:
        Boolean(serverEnv.supabaseUrl) &&
        Boolean(serverEnv.supabaseAnonKey) &&
        Boolean(serverEnv.supabaseServiceRoleKey),
      aiConfigured: Boolean(serverEnv.claudeApiKey),
    },
  };
}
