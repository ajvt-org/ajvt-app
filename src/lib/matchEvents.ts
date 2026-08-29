import { matchDisplay } from "@/lib/texts";

export type EventSide = "home" | "away" | null;

export type GoalSource = {
  memberId: string | null;
  side?: EventSide;
  fullName: string;
  photo: string | null;
  count: number;
  minute: number | null;
  kind?: "GOAL" | "PENALTY" | "OWN_GOAL";
};

export type BookingSource = {
  memberId: string;
  side?: EventSide;
  fullName: string;
  photo: string | null;
  cardType: "YELLOW" | "RED";
  minute: number | null;
};

export type MatchEventType = "goal" | "yellow" | "red" | "motm";

export type MinuteToken = { kind: "minute"; label: string } | { kind: "unknown"; count: number };

export type MatchEventRow = {
  key: string;
  side: EventSide;
  type: MatchEventType;
  name: string;
  team?: string | null;
  photo: string | null;
  minutes: MinuteToken[];
};

const MINUTES_PER_LINE = 2;
const NO_MINUTE = 999;

function kindSuffix(kind: GoalSource["kind"]): string {
  if (kind === "PENALTY") return ` (${matchDisplay.penaltyShort})`;
  if (kind === "OWN_GOAL") return ` (${matchDisplay.ownGoal})`;
  return "";
}

function minuteValue(token: MinuteToken | undefined): number {
  if (token?.kind !== "minute") return NO_MINUTE;
  const minute = parseInt(token.label, 10);
  return Number.isNaN(minute) ? NO_MINUTE : minute;
}

function sortMinutes(minutes: MinuteToken[]): MinuteToken[] {
  return [...minutes].sort((a, b) => minuteValue(a) - minuteValue(b));
}

function firstMinute(row: MatchEventRow): number {
  return minuteValue(row.minutes[0]);
}

function byFirstMinute(rows: MatchEventRow[]): MatchEventRow[] {
  return [...rows].sort((a, b) => firstMinute(a) - firstMinute(b));
}

export function goalRows(goals: GoalSource[]): MatchEventRow[] {
  const rows = new Map<string, MatchEventRow & { unnamed: number }>();
  for (const goal of goals) {
    const side = goal.side ?? null;
    const key = `${side ?? "any"}:${goal.memberId ?? `unknown:${goal.fullName}`}`;
    const row = rows.get(key) ?? {
      key,
      side,
      type: "goal" as const,
      name: goal.fullName,
      photo: goal.photo,
      minutes: [],
      unnamed: 0,
    };
    const total = Math.max(goal.count, 1);
    if (goal.minute === null) row.unnamed += total;
    else {
      row.minutes.push({ kind: "minute", label: `${goal.minute}'${kindSuffix(goal.kind)}` });
      if (total > 1) row.unnamed += total - 1;
    }
    rows.set(key, row);
  }
  return byFirstMinute(
    [...rows.values()].map(({ unnamed, ...row }) => ({
      ...row,
      minutes:
        unnamed > 0
          ? [...sortMinutes(row.minutes), { kind: "unknown" as const, count: unnamed }]
          : sortMinutes(row.minutes),
    })),
  );
}

export function bookingRows(bookings: BookingSource[]): MatchEventRow[] {
  const rows = new Map<string, MatchEventRow>();
  for (const booking of bookings) {
    const type = booking.cardType === "RED" ? "red" : "yellow";
    const side = booking.side ?? null;
    const key = `${side ?? "any"}:${booking.memberId}:${type}`;
    const row = rows.get(key) ?? {
      key,
      side,
      type,
      name: booking.fullName,
      photo: booking.photo,
      minutes: [],
    };
    if (booking.minute !== null) row.minutes.push({ kind: "minute", label: `${booking.minute}'` });
    rows.set(key, row);
  }
  return byFirstMinute(
    [...rows.values()].map((row) => ({ ...row, minutes: sortMinutes(row.minutes) })),
  );
}

export function withoutScorersAndCards(rows: MatchEventRow[]): MatchEventRow[] {
  return rows.filter((row) => row.type !== "goal" && row.type !== "red");
}

export function minuteLines(minutes: MinuteToken[], perLine = MINUTES_PER_LINE): MinuteToken[][] {
  const lines: MinuteToken[][] = [];
  for (let i = 0; i < minutes.length; i += perLine) lines.push(minutes.slice(i, i + perLine));
  return lines;
}

type EventPlayer = { id: string; fullName: string; photo: string | null };

export type EventMatch = {
  homeTeamId?: string;
  manOfTheMatchTeam?: string | null;
  hideGoalsOfTeamId?: string | null;
  goals: {
    count: number;
    minute: number | null;
    kind: string;
    teamId?: string;
    member: EventPlayer | null;
  }[];
  bookings: {
    cardType: string;
    minute: number | null;
    teamId?: string;
    member: EventPlayer;
  }[];
  manOfTheMatch?: EventPlayer | null;
};

function sideOf(teamId: string | undefined, homeTeamId: string | undefined): EventSide {
  if (!homeTeamId || !teamId) return null;
  return teamId === homeTeamId ? "home" : "away";
}

function shownGoals(match: EventMatch) {
  if (!match.hideGoalsOfTeamId) return match.goals;
  return match.goals.filter((goal) => goal.teamId !== match.hideGoalsOfTeamId);
}

export function matchEventRows(match: EventMatch): MatchEventRow[] {
  const rows = [
    ...goalRows(
      shownGoals(match).map((goal) => ({
        memberId: goal.member?.id ?? null,
        fullName: goal.member?.fullName ?? matchDisplay.unknownScorer,
        photo: goal.member?.photo ?? null,
        count: goal.count,
        minute: goal.minute,
        kind: goal.kind as GoalSource["kind"],
        side: sideOf(goal.teamId, match.homeTeamId),
      })),
    ),
    ...bookingRows(
      match.bookings.map((booking) => ({
        memberId: booking.member.id,
        fullName: booking.member.fullName,
        photo: booking.member.photo,
        cardType: booking.cardType === "RED" ? ("RED" as const) : ("YELLOW" as const),
        minute: booking.minute,
        side: sideOf(booking.teamId, match.homeTeamId),
      })),
    ),
  ];
  if (match.manOfTheMatch) {
    rows.push({
      key: `motm:${match.manOfTheMatch.id}`,
      side: null,
      type: "motm",
      name: match.manOfTheMatch.fullName,
      team: match.manOfTheMatchTeam ?? null,
      photo: match.manOfTheMatch.photo,
      minutes: [],
    });
  }
  return rows;
}

export function memberTeamName(
  memberId: string | null | undefined,
  teams: { name: string; members: { member: { id: string } }[] }[],
): string | null {
  if (!memberId) return null;
  const team = teams.find((one) => one.members.some((entry) => entry.member.id === memberId));
  return team?.name ?? null;
}

export type TimelineEntry = {
  key: string;
  minute: number | null;
  type: Exclude<MatchEventType, "motm">;
  name: string;
  photo: string | null;
  side: EventSide;
  note: string;
};

export function matchTimeline(match: EventMatch): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  shownGoals(match).forEach((goal, i) => {
    entries.push({
      key: `goal:${i}`,
      minute: goal.minute,
      type: "goal",
      name: goal.member?.fullName ?? matchDisplay.unknownScorer,
      photo: goal.member?.photo ?? null,
      side: sideOf(goal.teamId, match.homeTeamId),
      note:
        (goal.count > 1 ? ` (${goal.count})` : "") +
        kindSuffix(goal.kind as GoalSource["kind"]).trimStart(),
    });
  });
  match.bookings.forEach((booking, i) => {
    entries.push({
      key: `card:${i}`,
      minute: booking.minute,
      type: booking.cardType === "RED" ? "red" : "yellow",
      name: booking.member.fullName,
      photo: booking.member.photo,
      side: sideOf(booking.teamId, match.homeTeamId),
      note: "",
    });
  });
  return entries.sort((a, b) => (a.minute ?? NO_MINUTE) - (b.minute ?? NO_MINUTE));
}
