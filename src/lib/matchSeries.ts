import type { CountedBy, EndsBy, Unsettled, UnitOutcome } from "@prisma/client";

export type SeriesSide = "SIDE_A" | "SIDE_B";

export const HALVES_PER_UNIT = 2;

export interface SeriesRules {
  countedBy: CountedBy;
  endsBy: EndsBy;
  unitCount: number | null;
  target: number | null;
  unsettled: Unsettled | null;
  margin: number | null;
  continueUnits: number | null;
  deciderTarget: number | null;
  startingCredit: number;
  creditWindow: number;
}

export interface PlayedUnit {
  order: number;
  abandoned: boolean;
  outcome: UnitOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  worth?: number | null;
  sideALostCredit?: boolean;
  sideBLostCredit?: boolean;
  endedByRule?: boolean;
}

export interface RecordedMove {
  order: number;
  side: SeriesSide;
  selfHalves: number;
  otherHalves: number;
}

export interface SeriesStanding {
  sideATotal: number;
  sideBTotal: number;
  sideAAtClose: number;
  sideBAtClose: number;
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
  unsettled: boolean;
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
const NOTHING: Tally = { a: 0, b: 0 };

export function perUnitOf(rules: SeriesRules): number {
  return rules.countedBy === "POINTS" ? 1 : HALVES_PER_UNIT;
}

export function countsPoints(rules: SeriesRules): boolean {
  return rules.countedBy === "POINTS";
}

export function thresholdOf(rules: SeriesRules, decider = false): number | null {
  if (rules.endsBy !== "TARGET") return null;
  if (decider && rules.deciderTarget !== null) return rules.deciderTarget;
  return rules.target;
}

export function targetOf(rules: SeriesRules, decider = false): number | null {
  const threshold = thresholdOf(rules, decider);
  return threshold === null ? null : threshold * perUnitOf(rules);
}

function marginOf(rules: SeriesRules): number {
  return (rules.margin ?? 1) * perUnitOf(rules);
}

function creditOf(rules: SeriesRules): number {
  return rules.startingCredit * perUnitOf(rules);
}

export function creditLost(rules: SeriesRules, opening: Tally[]): Lost {
  if (rules.startingCredit <= 0 || rules.creditWindow <= 0) return KEPT;
  if (opening.length < rules.creditWindow) return KEPT;
  return {
    a: !opening.some((gained) => gained.a > 0),
    b: !opening.some((gained) => gained.b > 0),
  };
}

function takeBackCredit(rules: SeriesRules, totals: Tally, lost: Lost): void {
  const credit = creditOf(rules);
  if (lost.a) totals.a -= credit;
  if (lost.b) totals.b -= credit;
}

function skipped(unit: PlayedUnit): boolean {
  return unit.abandoned || unit.endedByRule === true;
}

export function gainOf(unit: PlayedUnit, rules: SeriesRules): Tally {
  if (skipped(unit)) return NOTHING;
  if (countsPoints(rules)) return { a: unit.sideAPoints ?? 0, b: unit.sideBPoints ?? 0 };
  const won = (unit.worth ?? 1) * HALVES_PER_UNIT;
  const drawn = HALVES_PER_UNIT / 2;
  if (unit.outcome === "SIDE_A") return { a: won, b: 0 };
  if (unit.outcome === "SIDE_B") return { a: 0, b: won };
  if (unit.outcome === "DRAW") return { a: drawn, b: drawn };
  return NOTHING;
}

function ordered(units: PlayedUnit[], moves: RecordedMove[]): number[] {
  const orders = [...units, ...moves].map((row) => row.order);
  return [...new Set(orders)].sort((one, two) => one - two);
}

function leaderOf(totals: Tally, margin: number): SeriesSide | null {
  if (totals.a - totals.b >= margin) return "SIDE_A";
  if (totals.b - totals.a >= margin) return "SIDE_B";
  return null;
}

function reachedTarget(totals: Tally, target: number | null): boolean {
  return target !== null && (totals.a >= target || totals.b >= target);
}

interface Verdict {
  winner: SeriesSide | null;
  over: boolean;
}

const RUNNING: Verdict = { winner: null, over: false };

interface Run extends Verdict {
  totals: Tally;
  atClose: Tally;
  unitsRecorded: number;
  unitsScored: number;
  lost: Lost;
}

function runUnits(
  rules: SeriesRules,
  units: PlayedUnit[],
  moves: RecordedMove[],
  target: number | null,
): Run {
  const credit = creditOf(rules);
  const totals: Tally = { a: credit, b: credit };
  let atClose: Tally = { ...totals };
  const margin = marginOf(rules);
  const opening: Tally[] = [];
  let lost = KEPT;
  let unitsRecorded = 0;
  let unitsScored = 0;
  let verdict = RUNNING;

  const reading = (): Verdict => {
    if (!reachedTarget(totals, target)) return RUNNING;
    const leader = leaderOf(totals, margin);
    if (leader) return { winner: leader, over: true };
    return { winner: null, over: rules.unsettled === "DRAW" || rules.unsettled === null };
  };

  for (const step of ordered(units, moves)) {
    for (const move of moves.filter((row) => row.order === step)) {
      if (move.side === "SIDE_A") {
        totals.a += move.selfHalves;
        totals.b -= move.otherHalves;
      } else {
        totals.b += move.selfHalves;
        totals.a -= move.otherHalves;
      }
      verdict = reading();
      if (verdict.over) break;
    }
    if (verdict.over) break;

    const unit = units.find((row) => row.order === step);
    if (unit) {
      unitsRecorded += 1;
      if (!skipped(unit)) unitsScored += 1;
      const gained = gainOf(unit, rules);
      atClose = { a: totals.a, b: totals.b };
      totals.a += gained.a;
      totals.b += gained.b;
      if (opening.length < rules.creditWindow) opening.push(gained);
      if (unitsRecorded === rules.creditWindow) {
        lost = creditLost(rules, opening);
        takeBackCredit(rules, totals, lost);
      }
      verdict = reading();
      if (verdict.over) break;
    }
  }

  return { totals, atClose, unitsRecorded, unitsScored, lost, ...verdict };
}

function allowedByCount(rules: SeriesRules, unitsRecorded: number, level: boolean): number {
  const ordinary = rules.unitCount ?? 0;
  if (!level) return Math.max(ordinary, unitsRecorded);
  if (rules.unsettled === "DECIDER") return Math.max(ordinary + 1, unitsRecorded);
  if (rules.unsettled !== "CONTINUE") return Math.max(ordinary, unitsRecorded);
  const more = rules.continueUnits ?? 0;
  let allowed = Math.max(ordinary, unitsRecorded);
  if (more > 0) while (unitsRecorded >= allowed) allowed += more;
  return allowed;
}

export function deriveSeries(
  rules: SeriesRules,
  units: PlayedUnit[],
  moves: RecordedMove[] = [],
  decider = false,
): SeriesStanding {
  const target = targetOf(rules, decider);
  const perUnit = perUnitOf(rules);
  const run = runUnits(rules, units, moves, target);
  const { totals, unitsRecorded, unitsScored } = run;
  const level = leaderOf(totals, marginOf(rules)) === null;

  if (rules.endsBy === "TARGET") {
    const over = run.over;
    return {
      sideATotal: totals.a,
      sideBTotal: totals.b,
      sideAAtClose: run.atClose.a,
      sideBAtClose: run.atClose.b,
      sideALostCredit: run.lost.a,
      sideBLostCredit: run.lost.b,
      scored: countsPoints(rules),
      perUnit,
      unitsRecorded,
      unitsScored,
      unitsLeft: over ? 0 : 1,
      unitsAllowed: over ? unitsRecorded : unitsRecorded + 1,
      target,
      over,
      level,
      unsettled: !over && level && reachedTarget(totals, target),
      extending: false,
      winner: run.winner,
    };
  }

  const unitsAllowed = allowedByCount(rules, unitsRecorded, level);
  const unitsLeft = Math.max(unitsAllowed - unitsRecorded, 0);
  const over = run.winner !== null || unitsLeft === 0;
  const winner = run.winner ?? (over ? leaderOf(totals, marginOf(rules)) : null);

  return {
    sideATotal: totals.a,
    sideBTotal: totals.b,
    sideAAtClose: run.atClose.a,
    sideBAtClose: run.atClose.b,
    sideALostCredit: run.lost.a,
    sideBLostCredit: run.lost.b,
    scored: countsPoints(rules),
    perUnit,
    unitsRecorded,
    unitsScored,
    unitsLeft,
    unitsAllowed,
    target,
    over,
    level,
    unsettled: !over && level && unitsRecorded >= (rules.unitCount ?? 0),
    extending: unitsAllowed > (rules.unitCount ?? 0),
    winner,
  };
}

export function nextUnitOrder(units: PlayedUnit[]): number {
  return units.reduce((highest, unit) => Math.max(highest, unit.order), 0) + 1;
}
