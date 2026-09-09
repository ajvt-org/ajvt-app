import { clubDayParts, formatMonthName, formatTime } from "./clubTime";
import { activityDates as texts } from "./texts";

export type ActivityDates = {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  withTime?: boolean;
  period?: string | null;
};

function dayStart(date: Date): number {
  const { year, month, day } = clubDayParts(date);
  return Date.UTC(year, month, day);
}

function dayCount(from: Date, to: Date): number {
  return Math.round((dayStart(to) - dayStart(from)) / (24 * 60 * 60 * 1000)) + 1;
}

function sameDay(a: Date, b: Date): boolean {
  return dayCount(a, b) === 1;
}

function withYear(text: string, year: number, now: Date): string {
  return year === clubDayParts(now).year ? text : `${text} ${year}`;
}

function onePart(d: Date, now: Date): string {
  const { day, year } = clubDayParts(d);
  return withYear(`${day} ${formatMonthName(d)}`, year, now);
}

function span(from: Date, to: Date, now: Date): string {
  const start = clubDayParts(from);
  const end = clubDayParts(to);
  if (start.year !== end.year) return `${onePart(from, now)} - ${onePart(to, now)}`;
  if (start.month !== end.month) {
    const head = `${start.day} ${formatMonthName(from)} - ${end.day} ${formatMonthName(to)}`;
    return withYear(head, end.year, now);
  }
  return withYear(`${start.day} - ${end.day} ${formatMonthName(to)}`, end.year, now);
}

function twoDays(from: Date, to: Date, now: Date): string {
  const start = clubDayParts(from);
  const end = clubDayParts(to);
  if (start.month !== end.month || start.year !== end.year) {
    return texts.twoDays(onePart(from, now), onePart(to, now));
  }
  return withYear(
    texts.twoDays(String(start.day), `${end.day} ${formatMonthName(to)}`),
    end.year,
    now,
  );
}

function clock(from: Date, to: Date | null, oneDay: boolean): string {
  if (to && oneDay && formatTime(to) !== formatTime(from)) {
    return texts.betweenTimes(formatTime(from), formatTime(to));
  }
  return texts.atTime(formatTime(from));
}

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
  return texts.withClock(dates, clock(from, to, days <= 1 && (!to || sameDay(from, to))));
}
