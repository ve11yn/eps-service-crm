import "server-only";

import {
  searchPricingItemsRepository,
  type PricingItemWithCatalog,
} from "@/backend/repositories";

function scorePricingItem(item: PricingItemWithCatalog, query: string): number {
  const normalizedQuery = query.toLowerCase().trim();
  const title = item.service_title.toLowerCase();
  const category = item.category?.toLowerCase() ?? "";
  const description = item.description?.toLowerCase() ?? "";

  let score = 0;

  if (title === normalizedQuery) score += 100;
  if (title.includes(normalizedQuery)) score += 40;
  if (category.includes(normalizedQuery)) score += 20;
  if (description.includes(normalizedQuery)) score += 10;

  return score;
}

export async function searchPricingItems(input: {
  query: string;
  catalogCode?: string;
  serviceDomain?: string;
  limit?: number;
}) {
  const items = await searchPricingItemsRepository(input);

  const rankedItems = [...items].sort((left, right) => {
    const rightScore = scorePricingItem(right, input.query);
    const leftScore = scorePricingItem(left, input.query);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return left.sort_order - right.sort_order;
  });

  return rankedItems;
}
