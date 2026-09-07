import type { BothPastTarget, MatchEnding, PartDecision, PartOutcome } from "@prisma/client";

export type SeriesSide = "SIDE_A" | "SIDE_B";

export interface SeriesRules {
  ending: MatchEnding;
  unitsPerParent: number;
  unitsToWin: number | null;
  target: number | null;
  deciderTarget: number | null;
  bothPastTarget: BothPastTarget | null;
  extendsWhenLevel: boolean;
  extensionUnits: number;
  startingCredit: number;
  creditWindow: number;
  halvesPerUnit: number;
  decision: PartDecision;
  wonUnitWorth: number;
  doubledWorth: number;
  doublesOnBlankOpponent: boolean;
  doublesOnRecoveredCredit: boolean;
}

export interface PlayedUnit {
  order: number;
  abandoned: boolean;
  outcome: PartOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  worth?: number | null;
  sideALostCredit?: boolean;
  sideBLostCredit?: boolean;
  endedByRule?: boolean;
}

export interface RecordedAdjustment {
  order: number;
  side: SeriesSide;
  selfHalves: number;
  otherHalves: number;
}

export interface SeriesStanding {
  sideATotal: number;
  sideBTotal: number;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  scored: boolean;
  perUnit: number;
  unitsRecorded: number;
  unitsScored: number;
  unitsLeft: number;
  unitsAllowed: number;
  target: number | null;
  over: boolean;
  level: boolean;
  extending: boolean;
  winner: SeriesSide | null;
}

interface Tally {
  a: number;
  b: number;
}

interface Lost {
  a: boolean;
  b: boolean;
}

const KEPT: Lost = { a: false, b: false };

export function creditLost(rules: SeriesRules, opening: Tally[]): Lost {
  if (rules.startingCredit <= 0 || rules.creditWindow <= 0) return KEPT;
  if (opening.length < rules.creditWindow) return KEPT;
  return {
    a: !opening.some((gained) => gained.a > 0),
    b: !opening.some((gained) => gained.b > 0),
  };
}

function takeBackCredit(rules: SeriesRules, totals: Tally, lost: Lost): void {
  if (lost.a) totals.a -= rules.startingCredit;
  if (lost.b) totals.b -= rules.startingCredit;
}

export function countsAScore(rules: SeriesRules): boolean {
  return rules.ending === "FIRST_PAST";
}

export function thresholdOf(rules: SeriesRules, decider = false): number | null {
  if (decider && rules.deciderTarget !== null) return rules.deciderTarget;
  if (rules.ending === "FIRST_PAST") return rules.target;
  if (rules.ending === "FIRST_TO") return rules.unitsToWin;
  return null;
}

export function targetHalves(rules: SeriesRules, decider = false): number | null {
  const threshold = thresholdOf(rules, decider);
  if (threshold === null || rules.ending !== "FIRST_TO") return null;
  return threshold * rules.halvesPerUnit;
}

function skipped(unit: PlayedUnit): boolean {
  return unit.abandoned || unit.endedByRule === true;
}

export function halvesOf(unit: PlayedUnit, rules: SeriesRules): Tally {
  if (skipped(unit)) return { a: 0, b: 0 };
  const won = (unit.worth ?? rules.wonUnitWorth) * rules.halvesPerUnit;
  const drawn = rules.halvesPerUnit / 2;
  if (rules.decision === "OUTCOME") {
    if (unit.outcome === "SIDE_A") return { a: won, b: 0 };
    if (unit.outcome === "SIDE_B") return { a: 0, b: won };
    if (unit.outcome === "DRAW") return { a: drawn, b: drawn };
    return { a: 0, b: 0 };
  }
  const a = unit.sideAPoints;
  const b = unit.sideBPoints;
  if (a === null || b === null) return { a: 0, b: 0 };
  if (a === b) return { a: drawn, b: drawn };
  return a > b ? { a: won, b: 0 } : { a: 0, b: won };
}

function scoreOf(unit: PlayedUnit): Tally {
  if (skipped(unit)) return { a: 0, b: 0 };
  return { a: unit.sideAPoints ?? 0, b: unit.sideBPoints ?? 0 };
}

function ordered(units: PlayedUnit[], adjustments: RecordedAdjustment[]): number[] {
  const orders = [...units, ...adjustments].map((row) => row.order);
  return [...new Set(orders)].sort((one, two) => one - two);
}

interface Verdict {
  winner: SeriesSide | null;
  over: boolean;
}

function pastTarget(totals: Tally, target: number | null, rules: SeriesRules): Verdict {
  if (target === null) return { winner: null, over: false };
  if (totals.a < target && totals.b < target) return { winner: null, over: false };
  if (totals.a !== totals.b) {
    return { winner: totals.a > totals.b ? "SIDE_A" : "SIDE_B", over: true };
  }
  return { winner: null, over: rules.bothPastTarget !== "PLAY_ON" };
}

function runHalves(
  rules: SeriesRules,
  units: PlayedUnit[],
  adjustments: RecordedAdjustment[],
  target: number | null,
) {
  const totals: Tally = { a: rules.startingCredit, b: rules.startingCredit };
  const opening: Tally[] = [];
  let lost = KEPT;
  let unitsRecorded = 0;
  let unitsScored = 0;
  let winner: SeriesSide | null = null;

  const reached = (): SeriesSide | null => {
    if (target === null) return null;
    if (totals.a >= target) return "SIDE_A";
    if (totals.b >= target) return "SIDE_B";
    return null;
  };

  for (const step of ordered(units, adjustments)) {
    for (const move of adjustments.filter((row) => row.order === step)) {
      if (move.side === "SIDE_A") {
        totals.a += move.selfHalves;
        totals.b -= move.otherHalves;
      } else {
        totals.b += move.selfHalves;
        totals.a -= move.otherHalves;
      }
      winner = reached();
      if (winner) break;
    }
    if (winner) break;

    const unit = units.find((row) => row.order === step);
    if (unit) {
      unitsRecorded += 1;
      if (!skipped(unit)) unitsScored += 1;
      const gained = halvesOf(unit, rules);
      totals.a += gained.a;
      totals.b += gained.b;
      if (opening.length < rules.creditWindow) opening.push(gained);
      if (unitsRecorded === rules.creditWindow) {
        lost = creditLost(rules, opening);
        takeBackCredit(rules, totals, lost);
      }
      winner = reached();
      if (winner) break;
    }
  }

  return {
    totals,
    unitsRecorded,
    unitsScored,
    winner,
    over: winner !== null,
    lost,
  };
}

function runScores(rules: SeriesRules, units: PlayedUnit[], target: number | null) {
  const totals: Tally = { a: rules.startingCredit, b: rules.startingCredit };
  const opening: Tally[] = [];
  let lost = KEPT;
  let unitsRecorded = 0;
  let unitsScored = 0;
  let verdict: Verdict = { winner: null, over: false };

  for (const unit of [...units].sort((one, two) => one.order - two.order)) {
    unitsRecorded += 1;
    if (!skipped(unit)) unitsScored += 1;
    const gained = scoreOf(unit);
    totals.a += gained.a;
    totals.b += gained.b;
    if (opening.length < rules.creditWindow) opening.push(gained);
    if (unitsRecorded === rules.creditWindow) {
      lost = creditLost(rules, opening);
      takeBackCredit(rules, totals, lost);
    }
    verdict = pastTarget(totals, target, rules);
    if (verdict.over) break;
  }

  return {
    totals,
    unitsRecorded,
    unitsScored,
    winner: verdict.winner,
    over: verdict.over,
    lost,
  };
}

export function deriveSeries(
  rules: SeriesRules,
  units: PlayedUnit[],
  adjustments: RecordedAdjustment[] = [],
  decider = false,
): SeriesStanding {
  const scored = countsAScore(rules);
  const target = scored ? thresholdOf(rules, decider) : targetHalves(rules, decider);
  const run = scored
    ? runScores(rules, units, target)
    : runHalves(rules, units, adjustments, target);

  const { totals, unitsRecorded, unitsScored } = run;
  let winner = run.winner;
  const level = totals.a === totals.b;

  if (scored) {
    const over = run.over;
    return {
      sideATotal: totals.a,
      sideBTotal: totals.b,
      sideALostCredit: run.lost.a,
      sideBLostCredit: run.lost.b,
      scored,
      perUnit: 1,
      unitsRecorded,
      unitsScored,
      unitsLeft: over ? 0 : 1,
      unitsAllowed: over ? unitsRecorded : unitsRecorded + 1,
      target,
      over,
      level,
      extending: false,
      winner,
    };
  }

  let unitsAllowed = Math.max(rules.unitsPerParent, unitsRecorded);
  if (rules.extendsWhenLevel && rules.extensionUnits > 0 && winner === null) {
    while (unitsRecorded >= unitsAllowed && level) unitsAllowed += rules.extensionUnits;
  }
  const unitsLeft = Math.max(unitsAllowed - unitsRecorded, 0);
  const over = winner !== null || unitsLeft === 0;
  if (winner === null && unitsLeft === 0 && !level) {
    winner = totals.a > totals.b ? "SIDE_A" : "SIDE_B";
  }

  return {
    sideATotal: totals.a,
    sideBTotal: totals.b,
    sideALostCredit: run.lost.a,
    sideBLostCredit: run.lost.b,
    scored,
    perUnit: rules.halvesPerUnit,
    unitsRecorded,
    unitsScored,
    unitsLeft,
    unitsAllowed,
    target,
    over,
    level,
    extending: unitsAllowed > rules.unitsPerParent,
    winner,
  };
}

export function nextUnitOrder(units: PlayedUnit[]): number {
  return units.reduce((highest, unit) => Math.max(highest, unit.order), 0) + 1;
}
