import type { MatchSide, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError, ConflictError } from "./errors";
import { tournament as messages } from "./messages";
import { isSeriesConfigured } from "./seriesSetup";
import { isFootball } from "./matchShape";
import { colourOfPart } from "./seriesColours";
import { ruleProblem, type RuleShape } from "./adjustmentRules";
import { isUniqueViolation } from "./prismaError";
import { ladderOf, type LevelRow } from "./matchLevels";
import type { SeriesStanding } from "./matchSeries";
import {
  flatten,
  nextOrderUnder,
  resolveMatch,
  rulesAt,
  toNodes,
  type AdjustmentRow,
  type UnitRow,
} from "./seriesTree";

export const LEVEL_FIELDS = {
  id: true,
  order: true,
  singular: true,
  plural: true,
  ending: true,
  unitsPerParent: true,
  unitsToWin: true,
  target: true,
  deciderTarget: true,
  bothPastTarget: true,
  extendsWhenLevel: true,
  extensionUnits: true,
  startingCredit: true,
  creditWindow: true,
  halvesPerUnit: true,
  decision: true,
  wonUnitWorth: true,
  doubledWorth: true,
  doublesOnBlankOpponent: true,
  doublesOnRecoveredCredit: true,
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

export const MATCH_WITH_SERIES = {
  units: UNITS_SELECT,
  adjustments: { orderBy: { createdAt: "asc" }, include: { rule: true } },
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
  adjustments: AdjustmentRow[] = [],
): SeriesStanding {
  return resolveMatch(activity.levels, units, adjustments).standing;
}

export interface UnitInput {
  parentId?: unknown;
  abandoned?: unknown;
  outcome?: unknown;
  sideAPoints?: unknown;
  sideBPoints?: unknown;
}

const OUTCOMES = new Set(["SIDE_A", "SIDE_B", "DRAW"]);

export function readUnit(
  input: UnitInput,
  level: LevelRow,
): {
  abandoned: boolean;
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
} {
  if (input.abandoned === true) {
    return { abandoned: true, outcome: null, sideAPoints: null, sideBPoints: null };
  }
  if (level.decision === "OUTCOME") {
    if (typeof input.outcome !== "string" || !OUTCOMES.has(input.outcome)) {
      throw new ValidationError(messages.partWantsAnOutcome);
    }
    return {
      abandoned: false,
      outcome: input.outcome as "SIDE_A" | "SIDE_B" | "DRAW",
      sideAPoints: null,
      sideBPoints: null,
    };
  }

  const a = input.sideAPoints;
  const b = input.sideBPoints;
  if (!Number.isInteger(a) || !Number.isInteger(b) || (a as number) < 0 || (b as number) < 0) {
    throw new ValidationError(messages.partWantsTwoScores);
  }
  return { abandoned: false, outcome: null, sideAPoints: a as number, sideBPoints: b as number };
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
  const resolved = resolveMatch(match.activity.levels, match.units, match.adjustments);
  if (parentId === null) return resolved.standing;
  const parent = flatten(resolved.units).find((unit) => unit.row.id === parentId);
  if (!parent) throw new NotFoundError(messages.partNotFound);
  return parent.standing;
}

export async function addUnit(matchId: string, input: UnitInput) {
  const match = await loadSeriesMatch(matchId);
  const parentId = parentIdOf(input);
  const level = levelAtDepth(match, depthOf(match, parentId) + 1);

  if (standingUnder(match, parentId)?.over) {
    throw new ConflictError(messages.matchTakesNoMoreParts);
  }

  const result = readUnit(input, level);
  const order = nextOrderUnder(match.units, parentId);
  const sideAColour =
    parentId === null && match.activity.hasColours && match.sideAOpensAs
      ? colourOfPart(match.sideAOpensAs, order)
      : null;

  return prisma.matchUnit.create({
    data: { matchId, parentId, levelId: level.id, order, sideAColour, ...result },
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

  const level = ladderFor(match).find((row) => row.id === unit.levelId);
  if (!level) throw new ValidationError(messages.unitLevelMissing);
  const result = readUnit(input, level);
  return prisma.matchUnit.update({ where: { id: unitId }, data: result });
}

export async function removeUnit(matchId: string, unitId: string) {
  const match = await loadSeriesMatch(matchId);
  const unit = unitOf(match, unitId);
  await prisma.matchUnit.delete({ where: { id: unitId } });
  return unit;
}

export async function recordAdjustment(
  matchId: string,
  ruleId: string,
  side: MatchSide,
  unitId: string,
) {
  const match = await loadSeriesMatch(matchId);
  const unit = unitOf(match, unitId);
  if (standingUnder(match, unit.parentId)?.over) {
    throw new ConflictError(messages.matchTakesNoMoreParts);
  }

  const rule = await prisma.adjustmentRule.findFirst({
    where: { id: ruleId, activityId: match.activityId },
  });
  if (!rule) throw new NotFoundError(messages.adjustmentRuleNotFound);

  return prisma.matchAdjustment.create({ data: { matchId, ruleId, side, unitId } });
}

export async function undoAdjustment(matchId: string, adjustmentId: string) {
  const match = await loadSeriesMatch(matchId);
  const recorded = match.adjustments.find((row) => row.id === adjustmentId);
  if (!recorded) throw new NotFoundError(messages.adjustmentNotFound);

  await prisma.matchAdjustment.delete({ where: { id: adjustmentId } });
  return recorded;
}

export async function listAdjustmentRules(activityId: string) {
  return prisma.adjustmentRule.findMany({ where: { activityId }, orderBy: { createdAt: "asc" } });
}

export async function declareAdjustmentRule(activityId: string, input: RuleShape) {
  const problem = ruleProblem(input);
  if (problem) throw new ValidationError(messages.adjustmentRule[problem]);
  if (input.levelId) {
    const level = await prisma.matchLevel.findFirst({ where: { id: input.levelId, activityId } });
    if (!level) throw new NotFoundError(messages.levelNotInTournament);
  }
  try {
    return await prisma.adjustmentRule.create({
      data: {
        activityId,
        name: input.name.trim(),
        unitsToSelf: input.unitsToSelf,
        unitsFromOther: input.unitsFromOther,
        levelId: input.levelId ?? null,
        endsUnit: input.endsUnit ?? false,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError(messages.adjustmentNameTaken);
    throw err;
  }
}

export async function withdrawAdjustmentRule(activityId: string, ruleId: string) {
  const rule = await prisma.adjustmentRule.findFirst({ where: { id: ruleId, activityId } });
  if (!rule) throw new NotFoundError(messages.adjustmentRuleNotFound);
  await prisma.adjustmentRule.delete({ where: { id: ruleId } });
  return rule;
}

export function seriesStateOf(match: LoadedMatch) {
  const resolved = resolveMatch(match.activity.levels, match.units, match.adjustments);
  return {
    units: toNodes(resolved.units),
    adjustments: match.adjustments,
    levels: ladderFor(match),
    standing: resolved.standing,
  };
}
