import {
  APP_LOCALE,
  APP_TIME_ZONE,
  createCalendarMonthDate,
  getCalendarDate,
  getCalendarDayKey,
  getCalendarMonthKey,
  parseStoredDateTime,
} from "@/lib/utils/dates";

export {
  APP_LOCALE,
  APP_TIME_ZONE,
  createCalendarMonthDate,
  getCalendarDate,
  getCalendarDayKey,
  getCalendarMonthKey,
  parseStoredDateTime,
};

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const chatTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const chatDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const chatLongDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthTitleFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const calendarMonthLabelFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "short",
});

export function formatDate(value?: string | null): string {
  const date = parseStoredDateTime(value);
  if (!date) return "Empty";

  return dateFormatter.format(date);
}

export function formatDateTime(value?: string | null): string {
  const date = parseStoredDateTime(value);
  if (!date) return "Empty";

  return dateTimeFormatter.format(date);
}

export function formatChatListTime(value?: string | null): string {
  const date = parseStoredDateTime(value);
  if (!date) return "";

  const today = new Date();
  if (getCalendarDayKey(date) === getCalendarDayKey(today)) {
    return chatTimeFormatter.format(date);
  }

  if (date.getFullYear() === today.getFullYear()) {
    return chatDateFormatter.format(date);
  }

  return chatLongDateFormatter.format(date);
}

export function formatMonthTitle(date: Date): string {
  return monthTitleFormatter.format(date);
}

export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date);
}

export function formatMonthLabel(date: Date): string {
  return calendarMonthLabelFormatter.format(date);
}

export function formatMoney(amount?: number | null): string {
  if (typeof amount !== "number") return "SGD 0";

  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(value?: string | null): string {
  if (!value) return "EP";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildMonthGrid(baseDate: Date): Date[] {
  const start = createCalendarMonthDate(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    1,
  );
  const firstDayIndex = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - firstDayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function isSameDay(left: Date, right: Date): boolean {
  return getCalendarDayKey(left) === getCalendarDayKey(right);
}

export function isSameMonth(left: Date, right: Date): boolean {
  return getCalendarMonthKey(left) === getCalendarMonthKey(right);
}

export function slugifyStatus(value?: string | null): string {
  return (value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const sourceChannelLabelMap: Record<string, string> = {
  whatsapp: "WhatsApp",
  web: "Web",
  phone: "Phone",
  manual: "Manual",
  referral: "Referral",
};

export function formatSourceChannelLabel(value?: string | null): string {
  if (!value) return "Unknown";

  return (
    sourceChannelLabelMap[value] ??
    value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
  );
}
