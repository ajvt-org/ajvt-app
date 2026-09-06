import type { MatchEnding, PartDecision, PartOutcome } from "@prisma/client";

export type SeriesSide = "SIDE_A" | "SIDE_B";

export const HALVES_PER_PART = 2;
export const PARTS_PER_EXTENSION = 2;

export interface SeriesRules {
  partsPerMatch: number;
  matchEnding: MatchEnding;
  partsToWin: number | null;
  partDecision: PartDecision;
  extendsWhenLevel: boolean;
}

export interface PlayedPart {
  order: number;
  abandoned: boolean;
  outcome: PartOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
}

export interface RecordedAdjustment {
  order: number;
  side: SeriesSide;
  selfHalves: number;
  otherHalves: number;
}

export interface SeriesStanding {
  sideAHalves: number;
  sideBHalves: number;
  partsRecorded: number;
  partsScored: number;
  partsLeft: number;
  partsAllowed: number;
  target: number | null;
  over: boolean;
  level: boolean;
  extending: boolean;
  winner: SeriesSide | null;
}

function halvesOf(part: PlayedPart, decision: PartDecision): { a: number; b: number } {
  if (part.abandoned) return { a: 0, b: 0 };
  if (decision === "OUTCOME") {
    if (part.outcome === "SIDE_A") return { a: HALVES_PER_PART, b: 0 };
    if (part.outcome === "SIDE_B") return { a: 0, b: HALVES_PER_PART };
    if (part.outcome === "DRAW") return { a: 1, b: 1 };
    return { a: 0, b: 0 };
  }
  const a = part.sideAPoints;
  const b = part.sideBPoints;
  if (a === null || b === null) return { a: 0, b: 0 };
  if (a === b) return { a: 1, b: 1 };
  return a > b ? { a: HALVES_PER_PART, b: 0 } : { a: 0, b: HALVES_PER_PART };
}

export function targetHalves(rules: SeriesRules): number | null {
  if (rules.matchEnding !== "FIRST_TO" || rules.partsToWin === null) return null;
  return rules.partsToWin * HALVES_PER_PART;
}

export function deriveSeries(
  rules: SeriesRules,
  parts: PlayedPart[],
  adjustments: RecordedAdjustment[] = [],
): SeriesStanding {
  const target = targetHalves(rules);
  const byOrder = [...parts].sort((one, two) => one.order - two.order);
  const steps = [...new Set([...byOrder, ...adjustments].map((row) => row.order))].sort(
    (one, two) => one - two,
  );

  let sideAHalves = 0;
  let sideBHalves = 0;
  let partsRecorded = 0;
  let partsScored = 0;
  let winner: SeriesSide | null = null;

  const reached = (): SeriesSide | null => {
    if (target === null) return null;
    if (sideAHalves >= target) return "SIDE_A";
    if (sideBHalves >= target) return "SIDE_B";
    return null;
  };

  for (const step of steps) {
    for (const move of adjustments.filter((row) => row.order === step)) {
      if (move.side === "SIDE_A") {
        sideAHalves += move.selfHalves;
        sideBHalves -= move.otherHalves;
      } else {
        sideBHalves += move.selfHalves;
        sideAHalves -= move.otherHalves;
      }
      winner = reached();
      if (winner) break;
    }
    if (winner) break;

    const part = byOrder.find((row) => row.order === step);
    if (part) {
      partsRecorded += 1;
      if (!part.abandoned) partsScored += 1;
      const gained = halvesOf(part, rules.partDecision);
      sideAHalves += gained.a;
      sideBHalves += gained.b;
      winner = reached();
      if (winner) break;
    }
  }

  const level = sideAHalves === sideBHalves;
  let partsAllowed = Math.max(rules.partsPerMatch, partsRecorded);
  if (rules.extendsWhenLevel && winner === null) {
    while (partsRecorded >= partsAllowed && level) partsAllowed += PARTS_PER_EXTENSION;
  }
  const partsLeft = Math.max(partsAllowed - partsRecorded, 0);
  const over = winner !== null || partsLeft === 0;
  if (winner === null && partsLeft === 0 && !level) {
    winner = sideAHalves > sideBHalves ? "SIDE_A" : "SIDE_B";
  }

  return {
    sideAHalves,
    sideBHalves,
    partsRecorded,
    partsScored,
    partsLeft,
    partsAllowed,
    target,
    over,
    level,
    extending: partsAllowed > rules.partsPerMatch,
    winner,
  };
}

export function acceptsAnotherPart(standing: SeriesStanding): boolean {
  return !standing.over;
}

export function nextPartOrder(parts: PlayedPart[]): number {
  return parts.reduce((highest, part) => Math.max(highest, part.order), 0) + 1;
}
