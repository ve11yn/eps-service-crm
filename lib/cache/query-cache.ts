import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

// Increment only when data is replaced outside normal application mutations.
// Normal writes should continue invalidating their scoped tags.
const CACHE_DATA_VERSION = "3";

export function cachedQuery<TArgs extends unknown[], TReturn>(
  keyParts: string[],
  fn: (...args: TArgs) => Promise<TReturn>,
  revalidate: number,
  tags: string[] = [],
): (...args: TArgs) => Promise<TReturn> {
  return unstable_cache(fn, ["crm-data", CACHE_DATA_VERSION, ...keyParts], {
    revalidate,
    tags,
  }) as (...args: TArgs) => Promise<TReturn>;
}

export function invalidateCachedTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}
