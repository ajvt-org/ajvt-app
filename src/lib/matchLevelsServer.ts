import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tournament as messages } from "./messages";
import { isFootball } from "./matchShape";
import { ladderProblem } from "./seriesSetup";
import { LEVEL_FIELDS } from "./matchSeriesServer";
import type { LevelRow } from "./matchLevels";

export type LevelInput = Omit<LevelRow, "id" | "order"> & { id?: string | null };

const PARKED = 1000;

const SCORING: (keyof LevelRow)[] = [
  "ending",
  "unitsPerParent",
  "unitsToWin",
  "target",
  "deciderTarget",
  "bothPastTarget",
  "extendsWhenLevel",
  "extensionUnits",
  "startingCredit",
  "creditWindow",
  "halvesPerUnit",
  "decision",
  "wonUnitWorth",
  "doubledWorth",
  "doublesOnBlankOpponent",
  "doublesOnRecoveredCredit",
];

export async function listLevels(activityId: string): Promise<LevelRow[]> {
  return prisma.matchLevel.findMany({
    where: { activityId },
    orderBy: { order: "asc" },
    select: LEVEL_FIELDS,
  });
}

function faultMessage(problem: ReturnType<typeof ladderProblem>): string {
  if (problem === null) return "";
  if (typeof problem === "string") return messages.seriesSetup[problem];
  return messages.seriesSetup[problem.problem];
}

function moved(before: LevelRow, after: LevelInput): boolean {
  const was = before as unknown as Record<string, unknown>;
  const now = after as unknown as Record<string, unknown>;
  return SCORING.some((field) => was[field] !== now[field]);
}

export async function playedLevelIds(activityId: string): Promise<string[]> {
  return [...(await levelsWithUnits(activityId))];
}

async function levelsWithUnits(activityId: string): Promise<Set<string>> {
  const played = await prisma.matchUnit.findMany({
    where: { level: { activityId } },
    select: { levelId: true },
    distinct: ["levelId"],
  });
  return new Set(played.map((row) => row.levelId));
}

function guardPlayedLevels(existing: LevelRow[], wanted: LevelInput[], played: Set<string>): void {
  const kept = new Map(
    wanted.flatMap((level, order) => (level.id ? [[level.id, { level, order }] as const] : [])),
  );
  for (const before of existing) {
    if (!played.has(before.id)) continue;
    const still = kept.get(before.id);
    if (!still) throw new ConflictError(messages.levelPlayedCannotGo);
    if (still.order !== before.order) throw new ConflictError(messages.levelPlayedCannotGo);
    if (moved(before, still.level)) throw new ConflictError(messages.levelPlayedCannotChange);
  }
}

function rowData(level: LevelInput) {
  const { id, ...rest } = level;
  void id;
  return rest;
}

export async function declareLevels(activityId: string, wanted: LevelInput[]) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { matchShape: true },
  });
  if (!activity) throw new NotFoundError(messages.matchNotFound);
  if (isFootball(activity.matchShape)) throw new ValidationError(messages.levelsFootballOnly);

  const ladder = wanted.map((level, order) => ({ ...level, id: level.id ?? "", order }));
  const problem = ladderProblem(ladder);
  if (problem) throw new ValidationError(faultMessage(problem));

  const existing = await listLevels(activityId);
  const known = new Set(existing.map((level) => level.id));
  for (const level of wanted) {
    if (level.id && !known.has(level.id)) throw new NotFoundError(messages.levelNotInTournament);
  }
  guardPlayedLevels(existing, wanted, await levelsWithUnits(activityId));

  const keep = wanted.map((level) => level.id).filter((id): id is string => !!id);

  return prisma.$transaction(async (tx) => {
    await tx.matchLevel.deleteMany({ where: { activityId, id: { notIn: keep } } });
    for (const level of existing) {
      if (keep.includes(level.id)) {
        await tx.matchLevel.update({
          where: { id: level.id },
          data: { order: level.order + PARKED },
        });
      }
    }
    for (const [order, level] of wanted.entries()) {
      if (level.id) {
        await tx.matchLevel.update({ where: { id: level.id }, data: { ...rowData(level), order } });
      } else {
        await tx.matchLevel.create({ data: { ...rowData(level), activityId, order } });
      }
    }
    return tx.matchLevel.findMany({
      where: { activityId },
      orderBy: { order: "asc" },
      select: LEVEL_FIELDS,
    });
  });
}
