import type { Competition } from "@prisma/client";
import { prisma } from "./prisma";
import {
  DEFAULT_BOARDS,
  DEFAULT_CONFIG,
  pickConfig,
  validateConfig,
  type CompetitionConfig,
} from "./competitionConfig";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { requireBank } from "./questionBankServer";
import type { RoundShape } from "./quizRound";
import { droppedBoards, mergeRunningBoards } from "./runningBoards";

export const ALREADY_STARTED = "المسابقة انطلقت، لا يمكن تعديل إعداداتها";
export const STARTS_IN_PAST = "وقت البداية قد مضى";
export const NO_COMPETITION = "لا توجد مسابقة";
export const NOT_STARTED_YET = "المسابقة لم تنطلق بعد";

export async function listCompetitions() {
  return prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, rounds: true } },
      boards: { orderBy: { order: "asc" } },
    },
  });
}

export async function getCompetition(id?: string) {
  const boards = { boards: { orderBy: { order: "asc" as const } } };
  if (id) return prisma.competition.findUnique({ where: { id }, include: boards });
  return prisma.competition.findFirst({ orderBy: { createdAt: "desc" }, include: boards });
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

export async function myCompetitions(userId: string) {
  const all = await prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participants: { where: { userId }, select: { id: true }, take: 1 },
      rounds: {
        select: { attempts: { where: { userId }, select: { score: true } } },
      },
    },
  });

  return all
    .filter((c) => (c.visibility === "PUBLIC" ? c.startedAt !== null : c.participants.length > 0))
    .map((c) => ({
      competition: c,
      mine: c.rounds.flatMap((r) => r.attempts),
    }));
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

type CompetitionRow = Competition & {
  boards?: {
    id?: string;
    title: string;
    blockTitle: string;
    blockRounds: number;
    counting: number;
    wholeRun: boolean;
  }[];
};

function asConfig(row: CompetitionRow): CompetitionConfig {
  return {
    name: row.name,
    startsAt: row.startsAt.toISOString(),
    visibility: row.visibility,
    roundCount: row.roundCount,
    roundPeriodMinutes: row.roundPeriodMinutes,
    roundWindowMinutes: row.roundWindowMinutes,
    servedCount: row.servedCount,
    boards: (row.boards ?? DEFAULT_BOARDS).map((b) => ({
      id: "id" in b ? b.id : undefined,
      title: b.title,
      blockTitle: b.blockTitle,
      blockRounds: b.blockRounds,
      counting: b.counting,
      wholeRun: b.wholeRun,
    })),
    categoryRounds: row.categoryRounds,
    bankId: row.bankId,
    fullSeconds: row.fullSeconds,
    maxSeconds: row.maxSeconds,
    floorPercent: row.floorPercent,
  };
}

function asRow(config: CompetitionConfig) {
  const { boards, ...rest } = config;
  void boards;
  return { ...rest, startsAt: new Date(config.startsAt) };
}

export async function saveRunningCompetition(raw: Partial<CompetitionConfig>, id: string) {
  const existing = await prisma.competition.findUnique({
    where: { id },
    include: { boards: { orderBy: { order: "asc" } } },
  });
  if (!existing) throw new NotFoundError(NO_COMPETITION);
  if (!existing.startedAt) throw new ConflictError(NOT_STARTED_YET);

  const input = pickConfig(raw);
  const current = asConfig(existing);
  const boards = mergeRunningBoards(existing.boards, input.boards ?? current.boards);

  const merged: CompetitionConfig = { ...current, name: input.name ?? current.name, boards };
  const problem = validateConfig(merged);
  if (problem) throw new ValidationError(problem);

  await prisma.$transaction([
    prisma.quizBoard.deleteMany({
      where: { competitionId: existing.id, id: { in: droppedBoards(existing.boards, boards) } },
    }),
    ...boards.map((board, order) =>
      board.id
        ? prisma.quizBoard.update({
            where: { id: board.id },
            data: { title: board.title.trim(), blockTitle: board.blockTitle.trim(), order },
          })
        : prisma.quizBoard.create({
            data: {
              competitionId: existing.id,
              title: board.title.trim(),
              blockTitle: board.blockTitle.trim(),
              blockRounds: board.blockRounds,
              counting: board.counting,
              wholeRun: board.wholeRun,
              order,
            },
          }),
    ),
    prisma.competition.update({
      where: { id: existing.id },
      data: { name: merged.name.trim() },
    }),
  ]);

  return requireCompetition(existing.id);
}

export async function saveCompetition(
  raw: Partial<CompetitionConfig>,
  id?: string,
  now = new Date(),
) {
  const input = pickConfig(raw);
  const existing = id
    ? await prisma.competition.findUnique({
        where: { id },
        include: { boards: { orderBy: { order: "asc" } } },
      })
    : null;
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
  if (new Date(merged.startsAt).getTime() < now.getTime() - 60_000) {
    throw new ValidationError(STARTS_IN_PAST);
  }
  merged.bankId = (await requireBank(merged.bankId)).id;

  const data = asRow(merged);
  const boards = merged.boards.map((board, order) => ({
    title: board.title.trim(),
    blockTitle: (board.blockTitle ?? "").trim(),
    blockRounds: board.blockRounds,
    counting: board.counting,
    wholeRun: board.wholeRun,
    order,
  }));

  if (existing) {
    await prisma.quizBoard.deleteMany({ where: { competitionId: existing.id } });
    return prisma.competition.update({
      where: { id: existing.id },
      data: { ...data, boards: { create: boards } },
    });
  }
  return prisma.competition.create({ data: { ...data, boards: { create: boards } } });
}

export async function copyCompetition(id: string, now = new Date()) {
  const source = await requireCompetition(id);
  const participants = await prisma.quizParticipant.findMany({
    where: { competitionId: source.id },
    select: { userId: true },
  });

  const startsAt = new Date(now.getTime() + 24 * 60 * 60_000);
  startsAt.setUTCHours(source.startsAt.getUTCHours(), source.startsAt.getUTCMinutes(), 0, 0);
  if (startsAt.getTime() <= now.getTime()) {
    startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  }

  return prisma.competition.create({
    data: {
      name: `نسخة من ${source.name}`,
      visibility: source.visibility,
      bankId: source.bankId,
      startsAt,
      roundCount: source.roundCount,
      roundPeriodMinutes: source.roundPeriodMinutes,
      roundWindowMinutes: source.roundWindowMinutes,
      servedCount: source.servedCount,
      categoryRounds: source.categoryRounds,
      fullSeconds: source.fullSeconds,
      maxSeconds: source.maxSeconds,
      floorPercent: source.floorPercent,
      boards: {
        create: source.boards.map((b, order) => ({
          title: b.title,
          blockTitle: b.blockTitle,
          blockRounds: b.blockRounds,
          counting: b.counting,
          wholeRun: b.wholeRun,
          order,
        })),
      },
      participants: { create: participants.map((p) => ({ userId: p.userId })) },
    },
  });
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
  const [rounds, attempts, participants] = await Promise.all([
    prisma.quizRound.count({ where: { competitionId: id } }),
    prisma.quizAttempt.count({ where: { round: { competitionId: id } } }),
    prisma.quizParticipant.count({ where: { competitionId: id } }),
  ]);
  await prisma.competition.delete({ where: { id: competition.id } });
  return { competition, rounds, attempts, participants };
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
