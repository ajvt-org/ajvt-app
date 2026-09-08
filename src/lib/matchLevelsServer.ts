import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tournament as messages } from "./messages";
import { isFootball } from "./matchShape";
import { ladderProblem } from "./seriesSetup";
import { LEVEL_FIELDS, MOVE_FIELDS } from "./matchSeriesServer";
import { ruleProblem, type RuleShape } from "./moveRules";
import { lockOf, type ConfigurationLock } from "./configurationLock";
import type { LevelRow } from "./matchLevels";

export type LevelInput = Omit<LevelRow, "id" | "order"> & { id?: string | null; key: string };

export type MoveInput = Omit<RuleShape, "levelId"> & { id?: string | null; levelKey: string };

const PARKED = 1000;

export async function listLevels(activityId: string): Promise<LevelRow[]> {
  return prisma.matchLevel.findMany({
    where: { activityId },
    orderBy: { order: "asc" },
    select: LEVEL_FIELDS,
  });
}

export async function listMoves(activityId: string) {
  return prisma.moveRule.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
    select: MOVE_FIELDS,
  });
}

function faultMessage(problem: ReturnType<typeof ladderProblem>): string {
  if (problem === null) return "";
  if (typeof problem === "string") return messages.seriesSetup[problem];
  return messages.seriesSetup[problem.problem];
}

export async function configurationLock(activityId: string): Promise<ConfigurationLock | null> {
  const [activity, recorded] = await Promise.all([
    prisma.activity.findUnique({ where: { id: activityId }, select: { startsAt: true } }),
    prisma.matchUnit.findFirst({ where: { level: { activityId } }, select: { id: true } }),
  ]);
  return lockOf(activity?.startsAt ?? null, recorded !== null, new Date());
}

function rowData(level: LevelInput) {
  const { id, key, ...rest } = level;
  void id;
  void key;
  return rest;
}

function moveData(move: MoveInput, levelId: string) {
  return {
    name: move.name.trim(),
    levelId,
    unitsToSelf: move.unitsToSelf,
    unitsFromOther: move.unitsFromOther,
    endsUnit: move.endsUnit ?? false,
    unitWorth: move.unitWorth ?? null,
  };
}

function guardMoves(moves: MoveInput[], keyed: Set<string>): void {
  const names = new Set<string>();
  for (const move of moves) {
    const problem = ruleProblem({
      ...move,
      levelId: keyed.has(move.levelKey) ? move.levelKey : "",
    });
    if (problem) throw new ValidationError(messages.moveRule[problem]);
    const name = move.name.trim();
    if (names.has(name)) throw new ConflictError(messages.moveNameTaken);
    names.add(name);
  }
}

export async function declareConfiguration(
  activityId: string,
  wanted: LevelInput[],
  moves: MoveInput[],
) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { matchShape: true },
  });
  if (!activity) throw new NotFoundError(messages.matchNotFound);
  if (isFootball(activity.matchShape)) throw new ValidationError(messages.levelsFootballOnly);

  const ladder = wanted.map((level, order) => ({ ...level, id: level.id ?? "", order }));
  const problem = ladderProblem(ladder);
  if (problem) throw new ValidationError(faultMessage(problem));
  guardMoves(moves, new Set(wanted.map((level) => level.key)));

  const lock = await configurationLock(activityId);
  if (lock) throw new ConflictError(messages.configurationLocked[lock]);

  const existing = await listLevels(activityId);
  const known = new Set(existing.map((level) => level.id));
  for (const level of wanted) {
    if (level.id && !known.has(level.id)) throw new NotFoundError(messages.levelNotInTournament);
  }

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
    const idOfKey = new Map<string, string>();
    for (const [order, level] of wanted.entries()) {
      const row = level.id
        ? await tx.matchLevel.update({
            where: { id: level.id },
            data: { ...rowData(level), order },
          })
        : await tx.matchLevel.create({ data: { ...rowData(level), activityId, order } });
      idOfKey.set(level.key, row.id);
    }

    const kept = moves.map((move) => move.id).filter((id): id is string => !!id);
    await tx.moveRule.deleteMany({ where: { activityId, id: { notIn: kept } } });
    for (const move of moves) {
      const levelId = idOfKey.get(move.levelKey)!;
      if (move.id) {
        await tx.moveRule.update({ where: { id: move.id }, data: moveData(move, levelId) });
      } else {
        await tx.moveRule.create({ data: { ...moveData(move, levelId), activityId } });
      }
    }

    return {
      levels: await tx.matchLevel.findMany({
        where: { activityId },
        orderBy: { order: "asc" },
        select: LEVEL_FIELDS,
      }),
      moves: await tx.moveRule.findMany({
        where: { activityId },
        orderBy: { createdAt: "asc" },
        select: MOVE_FIELDS,
      }),
    };
  });
}
