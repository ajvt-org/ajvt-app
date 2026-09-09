import type { UnitColour, UnitOutcome } from "@prisma/client";
import { deriveSeries, perUnitOf, type PlayedUnit, type SeriesStanding } from "./matchSeries";
import { ladderOf, recordsOnItself, type Ladder, type LevelRow } from "./matchLevels";
import { asMoves, type RecordedInstance } from "./moveRules";
import type { SeriesRules } from "./matchSeries";

export interface UnitRow {
  id: string;
  parentId: string | null;
  levelId: string;
  order: number;
  abandoned: boolean;
  outcome: UnitOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: UnitColour | null;
  worth: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
}

export interface MoveRule {
  id: string;
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string;
  endsUnit: boolean;
  unitWorth: number | null;
}

export interface MoveRow {
  id: string;
  unitId: string;
  side: "SIDE_A" | "SIDE_B";
  rule: MoveRule;
}

export interface Placement {
  move: MoveRow;
  container: string | null;
  order: number;
  ended: string | null;
}

export interface ResolvedUnit {
  row: UnitRow;
  depth: number;
  decider: boolean;
  endedBy: MoveRule | null;
  children: ResolvedUnit[];
  standing: SeriesStanding | null;
  played: PlayedUnit;
}

export interface ResolvedMatch {
  units: ResolvedUnit[];
  standing: SeriesStanding;
}

function countAt(ladder: Ladder, depth: number, level: LevelRow | null): number {
  if (level?.unitCount != null) return level.unitCount;
  return recordsOnItself(ladder) && depth === 0 ? 1 : 0;
}

export function rulesAt(ladder: Ladder, depth: number): SeriesRules {
  const level = ladder[depth] ?? null;
  return {
    countedBy: level?.countedBy ?? "OUTCOME",
    endsBy: level?.endsBy ?? "COUNT",
    unitCount: countAt(ladder, depth, level),
    target: level?.target ?? null,
    unsettled: level?.unsettled ?? null,
    margin: level?.margin ?? null,
    continueUnits: level?.continueUnits ?? null,
    deciderTarget: level?.deciderTarget ?? null,
    startingCredit: level?.startingCredit ?? 0,
    creditWindow: level?.creditWindow ?? 0,
  };
}

function typedPlay(row: UnitRow, endedByRule: boolean, worth: number | null): PlayedUnit {
  return {
    order: row.order,
    abandoned: row.abandoned,
    outcome: row.outcome,
    sideAPoints: row.sideAPoints,
    sideBPoints: row.sideBPoints,
    worth,
    sideALostCredit: row.sideALostCredit,
    sideBLostCredit: row.sideBLostCredit,
    endedByRule,
  };
}

function computedPlay(
  row: UnitRow,
  standing: SeriesStanding,
  endedByRule: boolean,
  worth: number | null,
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

export function markedWorth(moves: MoveRow[]): Map<string, number> {
  const marks = new Map<string, number>();
  for (const move of moves) {
    if (move.rule.unitWorth !== null) marks.set(move.unitId, move.rule.unitWorth);
  }
  return marks;
}

export function placeMoves(rows: UnitRow[], moves: MoveRow[]): Placement[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const placed: Placement[] = [];
  for (const move of moves) {
    const on = byId.get(move.unitId);
    if (!on) continue;
    placed.push({
      move,
      container: on.parentId,
      order: on.order,
      ended: move.rule.endsUnit ? on.id : null,
    });
  }
  return placed;
}

function movesIn(container: string | null, placements: Placement[]): RecordedInstance[] {
  return placements
    .filter((placed) => placed.container === container)
    .map((placed) => ({ order: placed.order, side: placed.move.side, rule: placed.move.rule }));
}

export function decidesItsParent(rules: SeriesRules, before: SeriesStanding): boolean {
  return rules.unsettled === "DECIDER" && before.unsettled;
}

export function resolveMatch(
  levels: LevelRow[],
  rows: UnitRow[],
  moves: MoveRow[] = [],
): ResolvedMatch {
  const ladder = ladderOf(levels);
  const groups = byParent(rows);
  const placements = placeMoves(rows, moves);
  const marks = markedWorth(moves);
  const endings = new Map(
    placements.filter((placed) => placed.ended).map((placed) => [placed.ended!, placed.move.rule]),
  );

  const resolve = (row: UnitRow, depth: number, decider: boolean): ResolvedUnit => {
    const endedBy = endings.get(row.id) ?? null;
    const worth = marks.get(row.id) ?? row.worth;
    const children = resolveSiblings(row.id, groups.get(row.id) ?? [], depth + 1);
    if (children.length === 0) {
      return {
        row,
        depth,
        decider,
        endedBy,
        children,
        standing: null,
        played: typedPlay(row, endedBy !== null, worth),
      };
    }
    const standing = standingUnder(ladder, depth, row.id, children, placements, decider);
    return {
      row,
      depth,
      decider,
      endedBy,
      children,
      standing,
      played: computedPlay(row, standing, endedBy !== null, worth),
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
      const decider = decidesItsParent(rulesAt(ladder, depth - 1), before);
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
    asMoves(movesIn(container, placements), perUnitOf(rules)),
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
  outcome: UnitOutcome | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideAColour: UnitColour | null;
  worth: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  decider: boolean;
  endedBy: MoveRule | null;
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
