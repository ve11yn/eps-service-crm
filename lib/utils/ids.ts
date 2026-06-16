export function assertId(value: string | null | undefined, label = "id"): string {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }

  return value;
}

export function isPresentId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
