import type { PartColour, PartOutcome } from "@prisma/client";
import { deriveSeries, type PlayedUnit, type SeriesStanding } from "./matchSeries";
import { ladderOf, type Ladder, type LevelRow } from "./matchLevels";
import { asAdjustments, type RecordedInstance } from "./adjustmentRules";
import type { SeriesRules } from "./matchSeries";

export interface UnitRow {
  id: string;
  parentId: string | null;
  levelId: string;
  order: number;
  abandoned: boolean;
  outcome: PartOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: PartColour | null;
  worth: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
}

export interface AdjustmentRule {
  id: string;
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string | null;
  endsUnit: boolean;
}

export interface AdjustmentRow {
  id: string;
  unitId: string;
  side: "SIDE_A" | "SIDE_B";
  rule: AdjustmentRule;
}

export interface Placement {
  move: AdjustmentRow;
  container: string | null;
  order: number;
  ended: string | null;
}

export interface ResolvedUnit {
  row: UnitRow;
  depth: number;
  decider: boolean;
  endedBy: AdjustmentRule | null;
  children: ResolvedUnit[];
  standing: SeriesStanding | null;
  played: PlayedUnit;
}

export interface ResolvedMatch {
  units: ResolvedUnit[];
  standing: SeriesStanding;
}

export function rulesAt(ladder: Ladder, depth: number): SeriesRules {
  const level = ladder[depth] ?? null;
  const child = ladder[depth + 1] ?? null;
  return {
    ending: level?.ending ?? "PLAY_ALL",
    unitsPerParent: level?.unitsPerParent ?? 0,
    unitsToWin: level?.unitsToWin ?? null,
    target: level?.target ?? null,
    deciderTarget: level?.deciderTarget ?? null,
    bothPastTarget: level?.bothPastTarget ?? null,
    extendsWhenLevel: level?.extendsWhenLevel ?? false,
    extensionUnits: level?.extensionUnits ?? 0,
    startingCredit: level?.startingCredit ?? 0,
    creditWindow: level?.creditWindow ?? 0,
    halvesPerUnit: level?.halvesPerUnit ?? 2,
    decision: child?.decision ?? "OUTCOME",
    wonUnitWorth: child?.wonUnitWorth ?? 1,
    doubledWorth: child?.doubledWorth ?? 1,
    doublesOnBlankOpponent: child?.doublesOnBlankOpponent ?? false,
    doublesOnRecoveredCredit: child?.doublesOnRecoveredCredit ?? false,
  };
}

function typedPlay(row: UnitRow, endedByRule: boolean): PlayedUnit {
  return {
    order: row.order,
    abandoned: row.abandoned,
    outcome: row.outcome,
    sideAPoints: row.sideAPoints,
    sideBPoints: row.sideBPoints,
    worth: row.worth,
    sideALostCredit: row.sideALostCredit,
    sideBLostCredit: row.sideBLostCredit,
    endedByRule,
  };
}

function computedPlay(
  row: UnitRow,
  standing: SeriesStanding,
  worth: number | null,
  endedByRule: boolean,
): PlayedUnit {
  const decided = standing.over;
  return {
    order: row.order,
    abandoned: row.abandoned || !decided,
    outcome: standing.winner ?? (decided ? "DRAW" : null),
    sideAPoints: standing.sideATotal,
    sideBPoints: standing.sideBTotal,
    worth,
    sideALostCredit: standing.sideALostCredit,
    sideBLostCredit: standing.sideBLostCredit,
    endedByRule,
  };
}

function other(side: "SIDE_A" | "SIDE_B"): "SIDE_A" | "SIDE_B" {
  return side === "SIDE_A" ? "SIDE_B" : "SIDE_A";
}

function totalOf(standing: SeriesStanding, side: "SIDE_A" | "SIDE_B"): number {
  return side === "SIDE_A" ? standing.sideATotal : standing.sideBTotal;
}

function lostCreditOf(standing: SeriesStanding, side: "SIDE_A" | "SIDE_B"): boolean {
  return side === "SIDE_A" ? standing.sideALostCredit : standing.sideBLostCredit;
}

export function computedWorth(
  ladder: Ladder,
  depth: number,
  container: string | null,
  children: ResolvedUnit[],
  standing: SeriesStanding,
  placements: Placement[],
  decider = false,
): number {
  const own = ladder[depth];
  if (!own || standing.winner === null) return own?.wonUnitWorth ?? 1;
  if (own.doublesOnRecoveredCredit && lostCreditOf(standing, standing.winner)) {
    return own.doubledWorth;
  }
  if (own.doublesOnBlankOpponent && standing.unitsRecorded > 0) {
    const before = standingUnder(
      ladder,
      depth,
      container,
      children.slice(0, standing.unitsRecorded - 1),
      placements,
      decider,
    );
    if (totalOf(before, other(standing.winner)) === 0) return own.doubledWorth;
  }
  return own.wonUnitWorth;
}

function byParent(rows: UnitRow[]): Map<string | null, UnitRow[]> {
  const groups = new Map<string | null, UnitRow[]>();
  for (const row of rows) {
    const siblings = groups.get(row.parentId) ?? [];
    siblings.push(row);
    groups.set(row.parentId, siblings);
  }
  for (const siblings of groups.values()) siblings.sort((one, two) => one.order - two.order);
  return groups;
}

export function placeMoves(rows: UnitRow[], adjustments: AdjustmentRow[]): Placement[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const placed: Placement[] = [];
  for (const move of adjustments) {
    const on = byId.get(move.unitId);
    if (!on) continue;
    const parent = on.parentId === null ? null : byId.get(on.parentId);
    if (!move.rule.endsUnit || !parent) {
      placed.push({ move, container: on.parentId, order: on.order, ended: null });
      continue;
    }
    placed.push({ move, container: parent.parentId, order: parent.order, ended: parent.id });
  }
  return placed;
}

function movesIn(container: string | null, placements: Placement[]): RecordedInstance[] {
  return placements
    .filter((placed) => placed.container === container)
    .map((placed) => ({ order: placed.order, side: placed.move.side, rule: placed.move.rule }));
}

export function decidesItsParent(
  rules: SeriesRules,
  index: number,
  before: SeriesStanding,
): boolean {
  return index === rules.unitsPerParent - 1 && before.level && !before.over;
}

export function resolveMatch(
  levels: LevelRow[],
  rows: UnitRow[],
  adjustments: AdjustmentRow[] = [],
): ResolvedMatch {
  const ladder = ladderOf(levels);
  const groups = byParent(rows);
  const placements = placeMoves(rows, adjustments);
  const endings = new Map(
    placements.filter((placed) => placed.ended).map((placed) => [placed.ended!, placed.move.rule]),
  );

  const resolve = (row: UnitRow, depth: number, decider: boolean): ResolvedUnit => {
    const endedBy = endings.get(row.id) ?? null;
    const children = resolveSiblings(row.id, groups.get(row.id) ?? [], depth + 1);
    if (children.length === 0) {
      return {
        row,
        depth,
        decider,
        endedBy,
        children,
        standing: null,
        played: typedPlay(row, endedBy !== null),
      };
    }
    const standing = standingUnder(ladder, depth, row.id, children, placements, decider);
    const worth = computedWorth(ladder, depth, row.id, children, standing, placements, decider);
    return {
      row,
      depth,
      decider,
      endedBy,
      children,
      standing,
      played: computedPlay(row, standing, worth, endedBy !== null),
    };
  };

  const resolveSiblings = (
    container: string | null,
    rows: UnitRow[],
    depth: number,
  ): ResolvedUnit[] => {
    const done: ResolvedUnit[] = [];
    for (const row of rows) {
      const before = standingUnder(ladder, depth - 1, container, done, placements);
      const decider = decidesItsParent(rulesAt(ladder, depth - 1), done.length, before);
      done.push(resolve(row, depth, decider));
    }
    return done;
  };

  const units = resolveSiblings(null, groups.get(null) ?? [], 1);
  return { units, standing: standingUnder(ladder, 0, null, units, placements) };
}

function standingUnder(
  ladder: Ladder,
  depth: number,
  container: string | null,
  children: ResolvedUnit[],
  placements: Placement[],
  decider = false,
): SeriesStanding {
  const rules = rulesAt(ladder, depth);
  return deriveSeries(
    rules,
    children.map((child) => child.played),
    asAdjustments(movesIn(container, placements), rules.halvesPerUnit),
    decider,
  );
}

export function flatten(units: ResolvedUnit[]): ResolvedUnit[] {
  return units.flatMap((unit) => [unit, ...flatten(unit.children)]);
}

export function nextOrderUnder(rows: UnitRow[], parentId: string | null): number {
  return (
    rows
      .filter((row) => row.parentId === parentId)
      .reduce((highest, row) => Math.max(highest, row.order), 0) + 1
  );
}

export interface UnitNode {
  id: string;
  levelId: string;
  order: number;
  abandoned: boolean;
  outcome: PartOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: PartColour | null;
  worth: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  decider: boolean;
  endedBy: AdjustmentRule | null;
  children: UnitNode[];
  standing: SeriesStanding | null;
}

export function toNodes(units: ResolvedUnit[]): UnitNode[] {
  return units.map(({ row, children, standing, played, endedBy, decider }) => ({
    id: row.id,
    levelId: row.levelId,
    order: row.order,
    abandoned: row.abandoned,
    outcome: row.outcome,
    sideAPoints: row.sideAPoints,
    sideBPoints: row.sideBPoints,
    sideAColour: row.sideAColour,
    decider,
    worth: played.worth ?? null,
    sideALostCredit: played.sideALostCredit ?? false,
    sideBLostCredit: played.sideBLostCredit ?? false,
    endedBy,
    children: toNodes(children),
    standing,
  }));
}
