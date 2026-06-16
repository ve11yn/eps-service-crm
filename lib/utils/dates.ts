export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function isPastDate(value: Date | string): boolean {
  return new Date(value).getTime() < Date.now();
}

export function addDays(value: Date | string, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}
