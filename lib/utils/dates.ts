export const APP_LOCALE = "en-SG";
export const APP_TIME_ZONE = "Asia/Singapore";

const calendarDayPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function parseStoredDateTime(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getCalendarParts(value: Date | string): {
  year: string;
  month: string;
  day: string;
} | null {
  const date = typeof value === "string" ? parseStoredDateTime(value) : value;
  if (!date) return null;

  const parts = calendarDayPartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;

  return { year, month, day };
}

export function getCalendarDate(value: Date | string): Date | null {
  const parts = getCalendarParts(value);
  if (!parts) return null;

  return createCalendarMonthDate(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );
}

export function getCalendarDayKey(value: Date | string): string {
  const parts = getCalendarParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

export function getCalendarMonthKey(value: Date | string): string {
  const parts = getCalendarParts(value);
  return parts ? `${parts.year}-${parts.month}` : "";
}

export function createCalendarMonthDate(
  year: number,
  monthIndex: number,
  day = 1,
): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

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
