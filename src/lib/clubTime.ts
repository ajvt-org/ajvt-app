export const CLUB_TIMEZONE = "Africa/Nouakchott";

const LOCAL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TIMEZONE });

const MONTH_NAME = new Intl.DateTimeFormat("ar", { month: "long", timeZone: CLUB_TIMEZONE });

const LONG_DATE = new Intl.DateTimeFormat("ar", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: CLUB_TIMEZONE,
});

function wallClockMs(date: Date): number {
  const parts = PARTS.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
}

export function clubOffsetMs(date: Date): number {
  return wallClockMs(date) - date.getTime();
}

export function fromClubWallClock(wallClock: number): Date {
  const first = new Date(wallClock - clubOffsetMs(new Date(wallClock)));
  return new Date(wallClock - clubOffsetMs(first));
}

export function toClubWallClock(date: string | Date): Date {
  return new Date(wallClockMs(new Date(date)));
}

export function parseMatchDate(value: string): Date {
  if (!LOCAL_INPUT.test(value)) return new Date(value);
  const padded = value.length === 16 ? `${value}:00` : value;
  return fromClubWallClock(Date.parse(`${padded}Z`));
}

export function matchDateToLocalInput(date: string | Date): string {
  return toClubWallClock(date).toISOString().slice(0, 16);
}

export function formatDayKey(key: string): string {
  return key.split("-").join("/");
}

export function formatDate(date: string | Date): string {
  return formatDayKey(toClubWallClock(date).toISOString().slice(0, 10));
}

export function formatTime(date: string | Date): string {
  return toClubWallClock(date).toISOString().slice(11, 16);
}

export function formatDateTime(date: string | Date): string {
  const at = toClubWallClock(date).toISOString();
  return `${formatDayKey(at.slice(0, 10))} ${at.slice(11, 16)}`;
}

export function formatMonthName(date: string | Date): string {
  return MONTH_NAME.format(new Date(date));
}

export function clubDayParts(date: string | Date): { year: number; month: number; day: number } {
  const at = toClubWallClock(date);
  return { year: at.getUTCFullYear(), month: at.getUTCMonth(), day: at.getUTCDate() };
}

export function formatLongDate(date: string | Date | null): string {
  if (!date) return "";
  return LONG_DATE.format(new Date(date));
}

export function matchDateKey(date: string | Date): string {
  return DAY_KEY.format(new Date(date));
}

export function todayClubDateKey(): string {
  return DAY_KEY.format(new Date());
}
