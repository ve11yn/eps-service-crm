import "server-only";

import { searchPricingItems } from "@/backend/services/pricing/search-pricing-items";
import type { AiExtractedWorkItem } from "@/types/integration";

function uniqueQueries(item: AiExtractedWorkItem): string[] {
  const titleKeywords = item.title
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length >= 4)
    .slice(0, 4);

  return Array.from(
    new Set(
      [item.itemType, item.itemGroup, item.title, ...titleKeywords]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function matchWorkItemToPricing(item: AiExtractedWorkItem) {
  for (const query of uniqueQueries(item)) {
    const matches = await searchPricingItems({ query, limit: 10 });
    if (matches.length > 0) {
      return matches[0];
    }
  }

  return null;
}
