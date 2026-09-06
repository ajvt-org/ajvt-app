import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError, ConflictError } from "./errors";
import { tournament as messages } from "./messages";
import { isSeriesConfigured } from "./seriesSetup";
import { isFootball } from "./matchShape";
import { colourOfPart } from "./seriesColours";
import {
  deriveSeries,
  nextPartOrder,
  type PlayedPart,
  type SeriesRules,
  type SeriesStanding,
} from "./matchSeries";

export const MATCH_WITH_SERIES = {
  parts: { orderBy: { order: "asc" } },
  activity: {
    select: {
      matchShape: true,
      partsPerMatch: true,
      matchEnding: true,
      partsToWin: true,
      partDecision: true,
      partTarget: true,
      partWord: true,
      partsWord: true,
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
  if (!isSeriesConfigured(match.activity)) {
    throw new ConflictError(messages.seriesNotConfigured);
  }
  return match;
}

export function rulesOf(
  activity: {
    partsPerMatch: number | null;
    matchEnding: "PLAY_ALL" | "FIRST_TO" | null;
    partsToWin: number | null;
    partDecision: "OUTCOME" | "POINTS" | "SCORE" | null;
  },
  isKnockout = false,
): SeriesRules {
  return {
    partsPerMatch: activity.partsPerMatch ?? 0,
    matchEnding: activity.matchEnding ?? "PLAY_ALL",
    partsToWin: activity.partsToWin,
    partDecision: activity.partDecision ?? "OUTCOME",
    extendsWhenLevel: isKnockout,
  };
}

export function standingOf(
  activity: Parameters<typeof rulesOf>[0],
  parts: PlayedPart[],
  isKnockout = false,
): SeriesStanding {
  return deriveSeries(rulesOf(activity, isKnockout), parts);
}

export interface PartInput {
  outcome?: unknown;
  sideAPoints?: unknown;
  sideBPoints?: unknown;
}

const OUTCOMES = new Set(["SIDE_A", "SIDE_B", "DRAW"]);

export function readPart(
  input: PartInput,
  decision: "OUTCOME" | "POINTS" | "SCORE",
  partTarget: number | null,
): {
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | null;
  sideAPoints: number | null;
  sideBPoints: number | null;
} {
  if (decision === "OUTCOME") {
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
  const sideAPoints = a as number;
  const sideBPoints = b as number;

  if (decision === "POINTS") {
    const target = partTarget ?? 0;
    if (Math.max(sideAPoints, sideBPoints) < target) {
      throw new ValidationError(messages.partBelowItsTarget(target));
    }
  }
  return { outcome: null, sideAPoints, sideBPoints };
}

export async function addPart(matchId: string, input: PartInput) {
  const match = await loadSeriesMatch(matchId);
  const standing = standingOf(match.activity, match.parts, match.isKnockout);
  if (standing.over) throw new ConflictError(messages.matchTakesNoMoreParts);

  const result = readPart(input, match.activity.partDecision!, match.activity.partTarget);
  const order = nextPartOrder(match.parts);
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

  const result = readPart(input, match.activity.partDecision!, match.activity.partTarget);
  return prisma.matchPart.update({ where: { id: partId }, data: { ...result, abandoned: false } });
}

export async function removePart(matchId: string, partId: string) {
  const match = await loadSeriesMatch(matchId);
  const part = match.parts.find((row) => row.id === partId);
  if (!part) throw new NotFoundError(messages.partNotFound);

  await prisma.matchPart.delete({ where: { id: partId } });
  return part;
}
