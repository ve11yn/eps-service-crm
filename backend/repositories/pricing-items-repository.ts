import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PricingCatalogRow = Database["public"]["Tables"]["pricing_catalogs"]["Row"];
type PricingItemRow = Database["public"]["Tables"]["pricing_items"]["Row"];

export type PricingItemWithCatalog = PricingItemRow & {
  pricing_catalogs: PricingCatalogRow | null;
};

export async function searchPricingItemsRepository(input: {
  query: string;
  catalogCode?: string;
  serviceDomain?: string;
  limit?: number;
}): Promise<PricingItemWithCatalog[]> {
  const supabase = createAdminSupabaseClient();
  const limit = input.limit ?? 20;

  let queryBuilder = supabase
    .from("pricing_items")
    .select("*, pricing_catalogs(*)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (input.catalogCode || input.serviceDomain) {
    queryBuilder = queryBuilder.not("catalog_id", "is", null);
  }

  if (input.catalogCode) {
    queryBuilder = queryBuilder.eq("pricing_catalogs.code", input.catalogCode);
  }

  if (input.serviceDomain) {
    queryBuilder = queryBuilder.eq(
      "pricing_catalogs.service_domain",
      input.serviceDomain,
    );
  }

  if (input.query.trim()) {
    const escaped = input.query.trim().replace(/,/g, " ");
    queryBuilder = queryBuilder.or(
      `service_title.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await queryBuilder;

  if (error) throw error;
  return (data ?? []) as PricingItemWithCatalog[];
}
