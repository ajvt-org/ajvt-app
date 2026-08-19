import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { breakdownOf, type AnswerRow, type Breakdown } from "./quizBreakdown";
import type { SpeedBand } from "./competitionConfig";

export const NO_ATTEMPT = "لا توجد محاولة";

export interface AttemptDetail {
  attemptId: string;
  userId: string;
  name: string;
  round: number;
  category: string | null;
  competitionId: string;
  competitionName: string;
  speedBands: SpeedBand[];
  groupSize: number;
  countingRounds: number;
  finishedAt: Date | null;
  breakdown: Breakdown;
}

export async function attemptDetail(attemptId: string): Promise<AttemptDetail> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      round: { include: { competition: true } },
      answers: { include: { question: true } },
    },
  });
  if (!attempt) throw new NotFoundError(NO_ATTEMPT);

  const member = await prisma.member.findFirst({
    where: { userId: attempt.userId },
    select: { fullName: true },
  });
  const bands = attempt.round.competition.speedBands as unknown as SpeedBand[];
  const rows: AnswerRow[] = attempt.answers.map((answer) => ({
    position: answer.position,
    question: answer.question.text,
    category: answer.question.category,
    maxPoints: answer.question.points,
    isCorrect: answer.isCorrect,
    elapsedMs: answer.elapsedMs,
    points: answer.points,
  }));

  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    name: member?.fullName ?? "",
    round: attempt.round.index,
    category: attempt.round.category,
    competitionId: attempt.round.competitionId,
    competitionName: attempt.round.competition.name,
    speedBands: bands,
    groupSize: attempt.round.competition.groupSize,
    countingRounds: attempt.round.competition.countingRounds,
    finishedAt: attempt.finishedAt,
    breakdown: breakdownOf(rows, bands),
  };
}

export async function attemptsOf(competitionId: string, userId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, round: { competitionId } },
    select: {
      id: true,
      score: true,
      finishedAt: true,
      round: { select: { index: true, category: true } },
    },
    orderBy: { round: { index: "asc" } },
  });
  return attempts.map((a) => ({
    attemptId: a.id,
    round: a.round.index,
    category: a.round.category,
    score: a.score,
    finishedAt: a.finishedAt,
  }));
}

export async function attemptsInRound(competitionId: string, index: number) {
  const round = await prisma.quizRound.findUnique({
    where: { competitionId_index: { competitionId, index } },
    select: { id: true },
  });
  if (!round) return [];

  const attempts = await prisma.quizAttempt.findMany({
    where: { roundId: round.id },
    select: { id: true, userId: true, score: true, finishedAt: true },
    orderBy: { score: "desc" },
  });
  const members = await prisma.member.findMany({
    where: { userId: { in: attempts.map((a) => a.userId) } },
    select: { userId: true, fullName: true },
  });
  const names = new Map(members.map((m) => [m.userId as string, m.fullName]));

  return attempts.map((a) => ({
    attemptId: a.id,
    userId: a.userId,
    name: names.get(a.userId) ?? "",
    score: a.score,
    finishedAt: a.finishedAt,
  }));
}
