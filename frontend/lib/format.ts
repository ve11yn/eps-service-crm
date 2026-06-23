export function formatDate(value?: string | null): string {
  if (!value) return "Empty";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Empty";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Empty";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Empty";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMonthTitle(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(date);
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
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const firstDayIndex = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - firstDayIndex);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function slugifyStatus(value?: string | null): string {
  return (value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
