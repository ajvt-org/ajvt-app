import { matchDisplay } from "@/lib/texts";

export type GoalSource = {
  memberId: string | null;
  fullName: string;
  photo: string | null;
  count: number;
  minute: number | null;
  kind?: "GOAL" | "PENALTY" | "OWN_GOAL";
};

export type BookingSource = {
  memberId: string;
  fullName: string;
  photo: string | null;
  cardType: "YELLOW" | "RED";
  minute: number | null;
};

export type MatchEventType = "goal" | "yellow" | "red" | "motm";

export type MatchEventRow = {
  key: string;
  type: MatchEventType;
  name: string;
  photo: string | null;
  minutes: string[];
};

const MINUTES_PER_LINE = 2;

function kindSuffix(kind: GoalSource["kind"]): string {
  if (kind === "PENALTY") return ` (${matchDisplay.penaltyShort})`;
  if (kind === "OWN_GOAL") return ` (${matchDisplay.ownGoal})`;
  return "";
}

function sortMinutes(minutes: string[]): string[] {
  return [...minutes].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
}

export function goalRows(goals: GoalSource[]): MatchEventRow[] {
  const rows = new Map<string, MatchEventRow & { unnamed: number }>();
  for (const goal of goals) {
    const key = goal.memberId ?? `unknown:${goal.fullName}`;
    const row = rows.get(key) ?? {
      key,
      type: "goal" as const,
      name: goal.fullName,
      photo: goal.photo,
      minutes: [],
      unnamed: 0,
    };
    const total = Math.max(goal.count, 1);
    if (goal.minute === null) row.unnamed += total;
    else {
      row.minutes.push(`${goal.minute}'${kindSuffix(goal.kind)}`);
      if (total > 1) row.unnamed += total - 1;
    }
    rows.set(key, row);
  }
  return [...rows.values()].map(({ unnamed, ...row }) => ({
    ...row,
    minutes:
      unnamed > 0
        ? [...sortMinutes(row.minutes), `(${row.minutes.length + unnamed})`]
        : sortMinutes(row.minutes),
  }));
}

export function bookingRows(bookings: BookingSource[]): MatchEventRow[] {
  const rows = new Map<string, MatchEventRow>();
  for (const booking of bookings) {
    const type = booking.cardType === "RED" ? "red" : "yellow";
    const key = `${booking.memberId}:${type}`;
    const row = rows.get(key) ?? {
      key,
      type,
      name: booking.fullName,
      photo: booking.photo,
      minutes: [],
    };
    if (booking.minute !== null) row.minutes.push(`${booking.minute}'`);
    rows.set(key, row);
  }
  return [...rows.values()].map((row) => ({ ...row, minutes: sortMinutes(row.minutes) }));
}

export function minuteLines(minutes: string[], perLine = MINUTES_PER_LINE): string[][] {
  const lines: string[][] = [];
  for (let i = 0; i < minutes.length; i += perLine) lines.push(minutes.slice(i, i + perLine));
  return lines;
}

type EventPlayer = { id: string; fullName: string; photo: string | null };

export type EventMatch = {
  goals: {
    count: number;
    minute: number | null;
    kind: string;
    member: EventPlayer | null;
  }[];
  bookings: { cardType: string; minute: number | null; member: EventPlayer }[];
  manOfTheMatch?: EventPlayer | null;
};

export function matchEventRows(match: EventMatch): MatchEventRow[] {
  const rows = [
    ...goalRows(
      match.goals.map((goal) => ({
        memberId: goal.member?.id ?? null,
        fullName: goal.member?.fullName ?? matchDisplay.unknownScorer,
        photo: goal.member?.photo ?? null,
        count: goal.count,
        minute: goal.minute,
        kind: goal.kind as GoalSource["kind"],
      })),
    ),
    ...bookingRows(
      match.bookings.map((booking) => ({
        memberId: booking.member.id,
        fullName: booking.member.fullName,
        photo: booking.member.photo,
        cardType: booking.cardType === "RED" ? ("RED" as const) : ("YELLOW" as const),
        minute: booking.minute,
      })),
    ),
  ];
  if (match.manOfTheMatch) {
    rows.push({
      key: `motm:${match.manOfTheMatch.id}`,
      type: "motm",
      name: `${matchDisplay.motm} ${match.manOfTheMatch.fullName}`,
      photo: match.manOfTheMatch.photo,
      minutes: [],
    });
  }
  return rows;
}
