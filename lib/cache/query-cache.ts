import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

export function cachedQuery<TArgs extends unknown[], TReturn>(
  keyParts: string[],
  fn: (...args: TArgs) => Promise<TReturn>,
  revalidate: number,
  tags: string[] = [],
): (...args: TArgs) => Promise<TReturn> {
  return unstable_cache(fn, keyParts, {
    revalidate,
    tags,
  }) as (...args: TArgs) => Promise<TReturn>;
}

export function invalidateCachedTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}
