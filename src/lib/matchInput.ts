// Goal rows and score pairs come straight from the admin form, so every field
// is unknown until checked. A minute outside 1..130 is a typo, not a real match
// event. A pair of nulls clears the score; a single null reads as zero, because
// that is what the form has always sent for "0".
export interface GoalInput {
  memberId: string;
  count: number;
  minute: number | null;
}

export function validateGoals(input: unknown): GoalInput[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const goals: GoalInput[] = [];
  for (const g of input) {
    if (!g || typeof g.memberId !== "string") return null;
    const count = Number(g.count);
    if (!Number.isInteger(count) || count <= 0) return null;
    let minute: number | null = null;
    if (g.minute !== undefined && g.minute !== null && g.minute !== "") {
      const m = Number(g.minute);
      if (!Number.isInteger(m) || m < 1 || m > 130) return null;
      minute = m;
    }
    goals.push({ memberId: g.memberId, count, minute });
  }
  return goals;
}

export type GoalKindInput = "GOAL" | "PENALTY" | "OWN_GOAL";
export type GoalPeriodInput = "REGULAR" | "EXTRA_TIME";

export interface GoalEvent {
  teamId: string;
  memberId: string | null;
  kind: GoalKindInput;
  period: GoalPeriodInput;
  minute: number | null;
}

export interface KickEvent {
  teamId: string;
  memberId: string | null;
  scored: boolean;
}

const KINDS: GoalKindInput[] = ["GOAL", "PENALTY", "OWN_GOAL"];
const PERIODS: GoalPeriodInput[] = ["REGULAR", "EXTRA_TIME"];

function parseMinute(raw: unknown): number | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  const m = Number(raw);
  if (!Number.isInteger(m) || m < 1 || m > 130) return "invalid";
  return m;
}

export function validateGoalEvents(
  input: unknown,
  homeTeamId: string,
  awayTeamId: string,
): GoalEvent[] | null {
  if (!Array.isArray(input)) return null;
  const events: GoalEvent[] = [];
  for (const g of input) {
    if (!g || (g.teamId !== homeTeamId && g.teamId !== awayTeamId)) return null;
    if (g.memberId !== null && typeof g.memberId !== "string") return null;
    const kind = g.kind === undefined ? "GOAL" : g.kind;
    if (!KINDS.includes(kind)) return null;
    const period = g.period === undefined ? "REGULAR" : g.period;
    if (!PERIODS.includes(period)) return null;
    const minute = parseMinute(g.minute);
    if (minute === "invalid") return null;
    events.push({ teamId: g.teamId, memberId: g.memberId ?? null, kind, period, minute });
  }
  return events;
}

export function validateKicks(
  input: unknown,
  homeTeamId: string,
  awayTeamId: string,
): KickEvent[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const kicks: KickEvent[] = [];
  for (const k of input) {
    if (!k || (k.teamId !== homeTeamId && k.teamId !== awayTeamId)) return null;
    if (k.memberId !== null && typeof k.memberId !== "string") return null;
    if (typeof k.scored !== "boolean") return null;
    kicks.push({ teamId: k.teamId, memberId: k.memberId ?? null, scored: k.scored });
  }
  return kicks;
}

export function scoreFromGoals(
  goals: { teamId: string }[],
  homeTeamId: string,
): { home: number; away: number } {
  const home = goals.filter((g) => g.teamId === homeTeamId).length;
  return { home, away: goals.length - home };
}

export function shootoutFromKicks(
  kicks: KickEvent[],
  homeTeamId: string,
): { home: number; away: number } {
  const home = kicks.filter((k) => k.teamId === homeTeamId && k.scored).length;
  const away = kicks.filter((k) => k.teamId !== homeTeamId && k.scored).length;
  return { home, away };
}

export type ScorePair = { home: number; away: number } | null;

export function parseScorePair(home: unknown, away: unknown): ScorePair | "invalid" {
  if (home === null && away === null) return null;
  const h = Number(home);
  const a = Number(away);
  if (!Number.isInteger(h) || h < 0 || !Number.isInteger(a) || a < 0) return "invalid";
  return { home: h, away: a };
}
