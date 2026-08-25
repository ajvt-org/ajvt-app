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

export function formatMatchDateTime(date: string | Date): string {
  const at = toClubWallClock(date).toISOString();
  return `${at.slice(0, 4)}/${at.slice(5, 7)}/${at.slice(8, 10)} ${at.slice(11, 16)}`;
}

export function formatMatchTime(date: string | Date): string {
  return toClubWallClock(date).toISOString().slice(11, 16);
}

export function matchDateKey(date: string | Date): string {
  return DAY_KEY.format(new Date(date));
}

export function todayClubDateKey(): string {
  return DAY_KEY.format(new Date());
}
