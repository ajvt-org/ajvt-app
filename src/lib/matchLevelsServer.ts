import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tournament as messages } from "./messages";
import { isFootball } from "./matchShape";
import { PLAYED_MATCH } from "./activityMatches";
import { ladderProblem } from "./seriesSetup";
import { LEVEL_FIELDS } from "./matchSeriesServer";
import type { LevelRow } from "./matchLevels";

export type LevelInput = Omit<LevelRow, "id" | "order">;

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

export async function declareLevels(activityId: string, wanted: LevelInput[]) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { matchShape: true },
  });
  if (!activity) throw new NotFoundError(messages.matchNotFound);
  if (isFootball(activity.matchShape)) throw new ValidationError(messages.levelsFootballOnly);

  const ladder = wanted.map((level, order) => ({ ...level, id: "", order }));
  const problem = ladderProblem(ladder);
  if (problem) throw new ValidationError(faultMessage(problem));

  const played = await prisma.match.count({ where: { activityId, ...PLAYED_MATCH } });
  if (played > 0) throw new ConflictError(messages.levelsLocked);

  return prisma.$transaction(async (tx) => {
    await tx.matchLevel.deleteMany({ where: { activityId } });
    for (const [order, level] of wanted.entries()) {
      await tx.matchLevel.create({ data: { ...level, activityId, order } });
    }
    return tx.matchLevel.findMany({
      where: { activityId },
      orderBy: { order: "asc" },
      select: LEVEL_FIELDS,
    });
  });
}
