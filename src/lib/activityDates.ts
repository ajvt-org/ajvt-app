const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export type ActivityDates = {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  withTime?: boolean;
  period?: string | null;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function time(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function dayCount(from: Date, to: Date): number {
  const day = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / day) + 1;
}

function sameDay(a: Date, b: Date): boolean {
  return dayCount(a, b) === 1;
}

// A year only earns its place when it is not the one the reader is in.
function withYear(text: string, year: number, now: Date): string {
  return year === now.getUTCFullYear() ? text : `${text} ${year}`;
}

function onePart(d: Date, now: Date): string {
  return withYear(`${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, d.getUTCFullYear(), now);
}

function span(from: Date, to: Date, now: Date): string {
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${onePart(from, now)} - ${onePart(to, now)}`;
  }
  if (from.getUTCMonth() !== to.getUTCMonth()) {
    const head = `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]} - ${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`;
    return withYear(head, to.getUTCFullYear(), now);
  }
  const head = `${from.getUTCDate()} - ${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`;
  return withYear(head, to.getUTCFullYear(), now);
}

function twoDays(from: Date, to: Date, now: Date): string {
  if (from.getUTCMonth() !== to.getUTCMonth() || from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `يومي ${onePart(from, now)} و ${onePart(to, now)}`;
  }
  const head = `يومي ${from.getUTCDate()} و ${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`;
  return withYear(head, to.getUTCFullYear(), now);
}

function clock(from: Date, to: Date | null, oneDay: boolean): string {
  if (to && oneDay && time(to) !== time(from)) return `من ${time(from)} إلى ${time(to)}`;
  return `الساعة ${time(from)}`;
}

// Returns null when there is nothing to phrase, so a caller can fall back to
// the legacy period text.
export function formatActivityDates(
  activity: ActivityDates,
  now: Date = new Date(),
): string | null {
  if (!activity.startsAt) return activity.period?.trim() || null;

  const from = new Date(activity.startsAt);
  const to = activity.endsAt ? new Date(activity.endsAt) : null;
  if (Number.isNaN(from.getTime())) return activity.period?.trim() || null;

  const days = to && !Number.isNaN(to.getTime()) ? dayCount(from, to) : 1;
  const dates =
    days <= 1 ? onePart(from, now) : days === 2 ? twoDays(from, to!, now) : span(from, to!, now);

  if (!activity.withTime) return dates;
  return `${dates}، ${clock(from, to, days <= 1 && (!to || sameDay(from, to)))}`;
}
