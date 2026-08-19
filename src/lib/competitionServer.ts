import type { Competition } from "@prisma/client";
import { prisma } from "./prisma";
import {
  DEFAULT_CONFIG,
  validateConfig,
  type CompetitionConfig,
  type SpeedBand,
} from "./competitionConfig";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import type { RoundShape } from "./quizRound";

export const ALREADY_STARTED = "المسابقة انطلقت، لا يمكن تعديل إعداداتها";
export const NO_COMPETITION = "لا توجد مسابقة";

export async function listCompetitions() {
  return prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { participants: true, rounds: true } } },
  });
}

export async function getCompetition(id?: string) {
  if (id) return prisma.competition.findUnique({ where: { id } });
  return prisma.competition.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function requireCompetition(id?: string) {
  const competition = await getCompetition(id);
  if (!competition) throw new NotFoundError(NO_COMPETITION);
  return competition;
}

export async function runningCompetitionsFor(userId: string) {
  const all = await prisma.competition.findMany({
    where: { startedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { participants: { where: { userId }, select: { id: true }, take: 1 } },
  });
  return all.filter((c) => c.visibility === "PUBLIC" || c.participants.length > 0);
}

export async function canPlay(competitionId: string, userId: string): Promise<boolean> {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { participants: { where: { userId }, select: { id: true }, take: 1 } },
  });
  if (!competition?.startedAt) return false;
  return competition.visibility === "PUBLIC" || competition.participants.length > 0;
}

export async function setParticipants(competitionId: string, userIds: string[]) {
  const competition = await requireCompetition(competitionId);
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);
  const unique = [...new Set(userIds)];
  const known = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.quizParticipant.deleteMany({ where: { competitionId } }),
    prisma.quizParticipant.createMany({
      data: known.map((u) => ({ competitionId, userId: u.id })),
    }),
  ]);
  return known.length;
}

function asConfig(row: Competition): CompetitionConfig {
  return {
    name: row.name,
    startsAt: row.startsAt.toISOString(),
    visibility: row.visibility,
    roundCount: row.roundCount,
    roundPeriodMinutes: row.roundPeriodMinutes,
    roundWindowMinutes: row.roundWindowMinutes,
    servedCount: row.servedCount,
    poolSize: row.poolSize,
    groupSize: row.groupSize,
    countingRounds: row.countingRounds,
    categoryRounds: row.categoryRounds,
    speedBands: row.speedBands as unknown as SpeedBand[],
  };
}

function asRow(config: CompetitionConfig) {
  return {
    ...config,
    startsAt: new Date(config.startsAt),
    speedBands: config.speedBands as unknown as object,
  };
}

export async function saveCompetition(input: Partial<CompetitionConfig>, id?: string) {
  const existing = id ? await getCompetition(id) : null;
  if (existing?.startedAt) throw new ConflictError(ALREADY_STARTED);

  const merged: CompetitionConfig = {
    ...DEFAULT_CONFIG,
    name: "",
    startsAt: "",
    ...(existing ? asConfig(existing) : {}),
    ...input,
  };

  const problem = validateConfig(merged);
  if (problem) throw new ValidationError(problem);

  const data = asRow(merged);
  if (existing) return prisma.competition.update({ where: { id: existing.id }, data });
  return prisma.competition.create({ data });
}

export async function startCompetition(id: string, now = new Date()) {
  const competition = await requireCompetition(id);
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);
  return prisma.competition.update({
    where: { id: competition.id },
    data: { startedAt: now },
  });
}

export async function resetCompetitionScores(id: string) {
  const competition = await requireCompetition(id);
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);
  const { count } = await prisma.quizAttempt.updateMany({
    where: { round: { competitionId: id }, score: { gt: 0 } },
    data: { score: 0 },
  });
  await prisma.quizAttemptAnswer.updateMany({
    where: { attempt: { round: { competitionId: id } } },
    data: { points: 0 },
  });
  return count;
}

export async function deleteCompetition(id: string) {
  const competition = await requireCompetition(id);
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);
  await prisma.competition.delete({ where: { id: competition.id } });
  return competition;
}

export function shapeOf(competition: {
  startsAt: Date;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
}): RoundShape {
  return {
    startsAt: competition.startsAt,
    roundCount: competition.roundCount,
    roundPeriodMinutes: competition.roundPeriodMinutes,
    roundWindowMinutes: competition.roundWindowMinutes,
  };
}
