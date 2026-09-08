import type { MatchSide, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError, ConflictError } from "./errors";
import { tournament as messages } from "./messages";
import { isSeriesConfigured } from "./seriesSetup";
import { isFootball } from "./matchShape";
import { colourOfPart } from "./seriesColours";
import { countsPoints, ladderOf, type LevelRow } from "./matchLevels";
import type { SeriesStanding } from "./matchSeries";
import {
  flatten,
  nextOrderUnder,
  resolveMatch,
  rulesAt,
  toNodes,
  type MoveRow,
  type UnitRow,
} from "./seriesTree";

export const LEVEL_FIELDS = {
  id: true,
  order: true,
  singular: true,
  plural: true,
  countedBy: true,
  endsBy: true,
  unitCount: true,
  target: true,
  unsettled: true,
  margin: true,
  continueUnits: true,
  deciderTarget: true,
  startingCredit: true,
  creditWindow: true,
} as const;

export const LEVELS_SELECT = { orderBy: { order: "asc" }, select: LEVEL_FIELDS } as const;

export const UNIT_FIELDS = {
  id: true,
  parentId: true,
  levelId: true,
  order: true,
  abandoned: true,
  outcome: true,
  sideAPoints: true,
  sideBPoints: true,
  sideAColour: true,
  worth: true,
  sideALostCredit: true,
  sideBLostCredit: true,
} as const;

export const UNITS_SELECT = { orderBy: { order: "asc" }, select: UNIT_FIELDS } as const;

export const MOVE_FIELDS = {
  id: true,
  name: true,
  levelId: true,
  unitsToSelf: true,
  unitsFromOther: true,
  endsUnit: true,
  unitWorth: true,
} as const;

export const MATCH_WITH_SERIES = {
  units: UNITS_SELECT,
  moves: { orderBy: { createdAt: "asc" }, include: { rule: true } },
  activity: {
    select: {
      matchShape: true,
      levels: LEVELS_SELECT,
      hasColours: true,
      firstColourWord: true,
      secondColourWord: true,
    },
  },
} as const;

type Client = PrismaClient | typeof prisma;

export async function loadSeriesMatch(matchId: string, client: Client = prisma) {
  const match = await client.match.findUnique({
    where: { id: matchId },
    include: MATCH_WITH_SERIES,
  });
  if (!match) throw new NotFoundError(messages.matchNotFound);
  if (isFootball(match.activity.matchShape)) {
    throw new ValidationError(messages.partsFootballOnly);
  }
  if (!isSeriesConfigured(ladderOf(match.activity.levels), match.activity)) {
    throw new ConflictError(messages.seriesNotConfigured);
  }
  return match;
}

export function rulesOf(ladder: LevelRow[], depth = 0) {
  return rulesAt(ladderOf(ladder), depth);
}

export function standingOf(
  activity: { levels: LevelRow[] },
  units: UnitRow[],
  moves: MoveRow[] = [],
): SeriesStanding {
  return resolveMatch(activity.levels, units, moves).standing;
}

export interface UnitInput {
  parentId?: unknown;
  abandoned?: unknown;
  outcome?: unknown;
  sideAPoints?: unknown;
  sideBPoints?: unknown;
  sideALostCredit?: unknown;
  sideBLostCredit?: unknown;
  worth?: unknown;
}

const OUTCOMES = new Set(["SIDE_A", "SIDE_B", "DRAW"]);

function readWorth(given: unknown): number | null {
  if (given === undefined || given === null) return null;
  if (!Number.isInteger(given) || (given as number) < 1) {
    throw new ValidationError(messages.unitWorthInvalid);
  }
  return given as number;
}

export function readUnit(
  input: UnitInput,
  parent: LevelRow,
): {
  abandoned: boolean;
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
  worth: number | null;
} {
  const credit = {
    sideALostCredit: input.sideALostCredit === true,
    sideBLostCredit: input.sideBLostCredit === true,
    worth: readWorth(input.worth),
  };
  if (input.abandoned === true) {
    return { abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null, ...credit };
  }
  if (!countsPoints(parent)) {
    if (typeof input.outcome !== "string" || !OUTCOMES.has(input.outcome)) {
      throw new ValidationError(messages.partWantsAnOutcome);
    }
    return {
      abandoned: false,
      outcome: input.outcome as "SIDE_A" | "SIDE_B" | "DRAW",
      sideAPoints: null,
      sideBPoints: null,
      ...credit,
    };
  }

  const a = input.sideAPoints;
  const b = input.sideBPoints;
  if (!Number.isInteger(a) || !Number.isInteger(b) || (a as number) < 0 || (b as number) < 0) {
    throw new ValidationError(messages.partWantsTwoScores);
  }
  return {
    abandoned: false,
    outcome: null,
    sideAPoints: a as number,
    sideBPoints: b as number,
    ...credit,
  };
}

type LoadedMatch = Awaited<ReturnType<typeof loadSeriesMatch>>;

function ladderFor(match: LoadedMatch) {
  return ladderOf(match.activity.levels);
}

function depthOf(match: LoadedMatch, unitId: string | null): number {
  let depth = 0;
  let at = unitId;
  while (at !== null) {
    const row = match.units.find((unit) => unit.id === at);
    if (!row) throw new NotFoundError(messages.partNotFound);
    depth += 1;
    at = row.parentId;
  }
  return depth;
}

function levelAtDepth(match: LoadedMatch, depth: number): LevelRow {
  const level = ladderFor(match)[depth];
  if (!level) throw new ValidationError(messages.unitLevelMissing);
  return level;
}

function parentIdOf(input: UnitInput): string | null {
  return typeof input.parentId === "string" && input.parentId ? input.parentId : null;
}

function standingUnder(match: LoadedMatch, parentId: string | null): SeriesStanding | null {
  const resolved = resolveMatch(match.activity.levels, match.units, match.moves);
  if (parentId === null) return resolved.standing;
  const parent = flatten(resolved.units).find((unit) => unit.row.id === parentId);
  if (!parent) throw new NotFoundError(messages.partNotFound);
  return parent.standing;
}

export async function addUnit(matchId: string, input: UnitInput) {
  const match = await loadSeriesMatch(matchId);
  const parentId = parentIdOf(input);
  const depth = depthOf(match, parentId);
  const level = levelAtDepth(match, depth + 1);

  if (standingUnder(match, parentId)?.over) {
    throw new ConflictError(messages.matchTakesNoMoreParts);
  }

  const result = readUnit(input, levelAtDepth(match, depth));
  const order = nextOrderUnder(match.units, parentId);
  const sideAColour =
    parentId === null && match.activity.hasColours && match.sideAOpensAs
      ? colourOfPart(match.sideAOpensAs, order)
      : null;

  const first = parentId !== null && !match.units.some((row) => row.parentId === parentId);

  return prisma.$transaction(async (tx) => {
    if (first) {
      await tx.matchUnit.update({
        where: { id: parentId },
        data: { outcome: null, sideAPoints: null, sideBPoints: null },
      });
    }
    return tx.matchUnit.create({
      data: { matchId, parentId, levelId: level.id, order, sideAColour, ...result },
    });
  });
}

function unitOf(match: LoadedMatch, unitId: string) {
  const unit = match.units.find((row) => row.id === unitId);
  if (!unit) throw new NotFoundError(messages.partNotFound);
  return unit;
}

export async function correctUnit(matchId: string, unitId: string, input: UnitInput) {
  const match = await loadSeriesMatch(matchId);
  const unit = unitOf(match, unitId);
  if (match.units.some((row) => row.parentId === unitId)) {
    throw new ConflictError(messages.unitTakesItsScoreFromBelow);
  }

  const depth = ladderFor(match).findIndex((row) => row.id === unit.levelId);
  if (depth < 1) throw new ValidationError(messages.unitLevelMissing);
  const result = readUnit(input, levelAtDepth(match, depth - 1));
  return prisma.matchUnit.update({ where: { id: unitId }, data: result });
}

export async function removeUnit(matchId: string, unitId: string) {
  const match = await loadSeriesMatch(matchId);
  const unit = unitOf(match, unitId);
  await prisma.matchUnit.delete({ where: { id: unitId } });
  return unit;
}

function actedOn(match: LoadedMatch, typedInto: UnitRow, levelId: string): UnitRow {
  if (typedInto.levelId === levelId) return typedInto;
  const parent = typedInto.parentId === null ? null : unitOf(match, typedInto.parentId);
  if (!parent || parent.levelId !== levelId) {
    throw new ValidationError(messages.moveWantsItsOwnLevel);
  }
  return parent;
}

export async function recordMove(matchId: string, ruleId: string, side: MatchSide, unitId: string) {
  const match = await loadSeriesMatch(matchId);
  const typedInto = unitOf(match, unitId);

  const rule = await prisma.moveRule.findFirst({
    where: { id: ruleId, activityId: match.activityId },
  });
  if (!rule) throw new NotFoundError(messages.moveRuleNotFound);

  const unit = actedOn(match, typedInto, rule.levelId);
  if (standingUnder(match, unit.parentId)?.over) {
    throw new ConflictError(messages.matchTakesNoMoreParts);
  }

  return prisma.$transaction(async (tx) => {
    if (typedInto.id !== unit.id) {
      await tx.matchUnit.update({
        where: { id: typedInto.id },
        data: { abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null },
      });
    }
    return tx.matchMove.create({ data: { matchId, ruleId, side, unitId: unit.id } });
  });
}

export async function undoMove(matchId: string, moveId: string) {
  const match = await loadSeriesMatch(matchId);
  const recorded = match.moves.find((row) => row.id === moveId);
  if (!recorded) throw new NotFoundError(messages.moveNotFound);

  await prisma.matchMove.delete({ where: { id: moveId } });
  return recorded;
}

export function seriesStateOf(match: LoadedMatch) {
  const resolved = resolveMatch(match.activity.levels, match.units, match.moves);
  return {
    units: toNodes(resolved.units),
    moves: match.moves,
    levels: ladderFor(match),
    standing: resolved.standing,
  };
}
