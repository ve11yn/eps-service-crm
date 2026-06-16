export function normalizePhone(input: string): string {
  return input.replace(/[^\d+]/g, "").trim();
}

export function looksLikePhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return normalized.length >= 8;
}
