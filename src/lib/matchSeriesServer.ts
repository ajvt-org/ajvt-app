import type { MatchSide, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError, ConflictError } from "./errors";
import { tournament as messages } from "./messages";
import { isSeriesConfigured } from "./seriesSetup";
import { isFootball } from "./matchShape";
import { colourOfPart } from "./seriesColours";
import {
  asAdjustments,
  ruleProblem,
  type RecordedInstance,
  type RuleShape,
} from "./adjustmentRules";
import { isUniqueViolation } from "./prismaError";
import { childLevelAt, ladderOf, levelAt, type Ladder, type LevelRow } from "./matchLevels";
import {
  deriveSeries,
  nextUnitOrder,
  type PlayedUnit,
  type SeriesRules,
  type SeriesStanding,
} from "./matchSeries";

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

export const MATCH_WITH_SERIES = {
  parts: { orderBy: { order: "asc" } },
  adjustments: { orderBy: { order: "asc" }, include: { rule: true } },
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

export interface SeriesActivity {
  levels: LevelRow[];
  hasColours: boolean;
  firstColourWord: string | null;
  secondColourWord: string | null;
}

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

export function rulesOf(ladder: Ladder, depth = 0): SeriesRules {
  const level = levelAt(ladder, depth);
  const child = childLevelAt(ladder, depth);
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

export function standingOf(
  activity: { levels: LevelRow[] },
  units: PlayedUnit[],
  recorded: RecordedInstance[] = [],
): SeriesStanding {
  const ladder = ladderOf(activity.levels);
  const rules = rulesOf(ladder);
  return deriveSeries(rules, units, asAdjustments(recorded, rules.halvesPerUnit));
}

export interface PartInput {
  outcome?: unknown;
  sideAPoints?: unknown;
  sideBPoints?: unknown;
}

const OUTCOMES = new Set(["SIDE_A", "SIDE_B", "DRAW"]);

export function readUnit(
  input: PartInput,
  level: LevelRow,
): {
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
} {
  if (level.decision === "OUTCOME") {
    if (typeof input.outcome !== "string" || !OUTCOMES.has(input.outcome)) {
      throw new ValidationError(messages.partWantsAnOutcome);
    }
    return {
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
  return { outcome: null, sideAPoints: a as number, sideBPoints: b as number };
}

function unitLevelOf(match: Awaited<ReturnType<typeof loadSeriesMatch>>): LevelRow {
  const level = childLevelAt(ladderOf(match.activity.levels), 0);
  if (!level) throw new ConflictError(messages.seriesNotConfigured);
  return level;
}

export async function addPart(matchId: string, input: PartInput) {
  const match = await loadSeriesMatch(matchId);
  const standing = standingOf(match.activity, match.parts, match.adjustments);
  if (standing.over) throw new ConflictError(messages.matchTakesNoMoreParts);

  const result = readUnit(input, unitLevelOf(match));
  const order = nextUnitOrder(match.parts);
  const sideAColour =
    match.activity.hasColours && match.sideAOpensAs
      ? colourOfPart(match.sideAOpensAs, order)
      : null;

  return prisma.matchPart.create({ data: { matchId, order, sideAColour, ...result } });
}

export async function correctPart(matchId: string, partId: string, input: PartInput) {
  const match = await loadSeriesMatch(matchId);
  const part = match.parts.find((row) => row.id === partId);
  if (!part) throw new NotFoundError(messages.partNotFound);

  const result = readUnit(input, unitLevelOf(match));
  return prisma.matchPart.update({ where: { id: partId }, data: { ...result, abandoned: false } });
}

export async function removePart(matchId: string, partId: string) {
  const match = await loadSeriesMatch(matchId);
  const part = match.parts.find((row) => row.id === partId);
  if (!part) throw new NotFoundError(messages.partNotFound);

  await prisma.matchPart.delete({ where: { id: partId } });
  return part;
}

export async function recordAdjustment(matchId: string, ruleId: string, side: MatchSide) {
  const match = await loadSeriesMatch(matchId);
  const standing = standingOf(match.activity, match.parts, match.adjustments);
  if (standing.over) throw new ConflictError(messages.matchTakesNoMoreParts);

  const rule = await prisma.adjustmentRule.findFirst({
    where: { id: ruleId, activityId: match.activityId },
  });
  if (!rule) throw new NotFoundError(messages.adjustmentRuleNotFound);

  const order = nextUnitOrder(match.parts);

  return prisma.$transaction(async (tx) => {
    await tx.matchPart.create({
      data: {
        matchId,
        order,
        abandoned: true,
        sideAColour:
          match.activity.hasColours && match.sideAOpensAs
            ? colourOfPart(match.sideAOpensAs, order)
            : null,
      },
    });
    return tx.matchAdjustment.create({ data: { matchId, ruleId, side, order } });
  });
}

export async function undoAdjustment(matchId: string, adjustmentId: string) {
  const match = await loadSeriesMatch(matchId);
  const recorded = match.adjustments.find((row) => row.id === adjustmentId);
  if (!recorded) throw new NotFoundError(messages.adjustmentNotFound);

  const stillThere = match.adjustments.filter(
    (row) => row.id !== adjustmentId && row.order === recorded.order,
  );

  return prisma.$transaction(async (tx) => {
    await tx.matchAdjustment.delete({ where: { id: adjustmentId } });
    if (stillThere.length === 0) {
      const part = match.parts.find((row) => row.order === recorded.order);
      if (part) await tx.matchPart.delete({ where: { id: part.id } });
    }
    return recorded;
  });
}

export async function listAdjustmentRules(activityId: string) {
  return prisma.adjustmentRule.findMany({ where: { activityId }, orderBy: { createdAt: "asc" } });
}

export async function declareAdjustmentRule(activityId: string, input: RuleShape) {
  const problem = ruleProblem(input);
  if (problem) throw new ValidationError(messages.adjustmentRule[problem]);
  if (input.levelId) {
    const level = await prisma.matchLevel.findFirst({
      where: { id: input.levelId, activityId },
    });
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

export function seriesStateOf(match: Awaited<ReturnType<typeof loadSeriesMatch>>) {
  return {
    parts: match.parts,
    adjustments: match.adjustments,
    levels: ladderOf(match.activity.levels),
    standing: standingOf(match.activity, match.parts, match.adjustments),
  };
}
