import { CLUB_TIMEZONE, matchDateKey } from "./clubTime";

const WEEKDAYS: Record<string, string> = {
  Sun: "الأحد",
  Mon: "الاثنين",
  Tue: "الثلاثاء",
  Wed: "الأربعاء",
  Thu: "الخميس",
  Fri: "الجمعة",
  Sat: "السبت",
};

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

export const UNDATED_LABEL = "موعد لاحق";

export type DatedMatch = {
  matchDate: Date | string | null;
  round?: string | null;
  venue?: string | null;
};

export type MatchDay<T> = {
  key: string;
  label: string;
  round: string | null;
  venue: string | null;
  matches: T[];
};

export function formatDayLabel(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAYS[part("weekday")] ?? "";
  const month = MONTHS[Number(part("month")) - 1] ?? "";
  return `${weekday} ${part("day")} ${month}`.trim();
}

function shared<T>(matches: T[], pick: (m: T) => string | null | undefined): string | null {
  const first = pick(matches[0])?.trim() || null;
  if (!first) return null;
  return matches.every((m) => (pick(m)?.trim() || null) === first) ? first : null;
}

export function groupMatchesByDay<T extends DatedMatch>(matches: T[]): MatchDay<T>[] {
  const byDay = new Map<string, T[]>();
  for (const match of matches) {
    const key = match.matchDate ? matchDateKey(match.matchDate) : "";
    const day = byDay.get(key) ?? [];
    day.push(match);
    byDay.set(key, day);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([key, day]) => {
      const sorted = key
        ? [...day].sort(
            (a, b) => new Date(a.matchDate!).getTime() - new Date(b.matchDate!).getTime(),
          )
        : day;
      return {
        key,
        label: key ? formatDayLabel(sorted[0].matchDate!) : UNDATED_LABEL,
        round: shared(sorted, (m) => m.round),
        venue: shared(sorted, (m) => m.venue),
        matches: sorted,
      };
    });
}
