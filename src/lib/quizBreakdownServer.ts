import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { breakdownOf, type AnswerRow, type Breakdown } from "./quizBreakdown";
import type { ScoreCurve } from "./competitionConfig";

export const NO_ATTEMPT = "لا توجد محاولة";

export interface AttemptDetail {
  attemptId: string;
  userId: string;
  name: string;
  round: number;
  category: string | null;
  competitionId: string;
  competitionName: string;
  curve: ScoreCurve;
  boards: { title: string; blockRounds: number; counting: number; wholeRun: boolean }[];
  finishedAt: Date | null;
  breakdown: Breakdown;
}

export async function attemptDetail(attemptId: string): Promise<AttemptDetail> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      round: { include: { competition: { include: { boards: { orderBy: { order: "asc" } } } } } },
      answers: { include: { question: { include: { answers: true } } } },
    },
  });
  if (!attempt) throw new NotFoundError(NO_ATTEMPT);

  const member = await prisma.member.findFirst({
    where: { userId: attempt.userId },
    select: { fullName: true },
  });
  const boards = attempt.round.competition.boards;
  const curve: ScoreCurve = {
    fullSeconds: attempt.round.competition.fullSeconds,
    maxSeconds: attempt.round.competition.maxSeconds,
    floorPercent: attempt.round.competition.floorPercent,
  };
  const rows: AnswerRow[] = attempt.answers.map((answer) => {
    const picked = new Set(answer.selectedAnswerIds);
    return {
      position: answer.position,
      question: answer.question.text,
      category: answer.question.category,
      maxPoints: answer.question.points,
      isCorrect: answer.isCorrect,
      elapsedMs: answer.elapsedMs,
      points: answer.points,
      correct: answer.question.answers.filter((a) => a.isCorrect).map((a) => a.text),
      chosen: answer.question.answers.filter((a) => picked.has(a.id)).map((a) => a.text),
    };
  });

  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    name: member?.fullName ?? "",
    round: attempt.round.index,
    category: attempt.round.category,
    competitionId: attempt.round.competitionId,
    competitionName: attempt.round.competition.name,
    curve,
    boards: boards.map((b) => ({
      title: b.title,
      blockRounds: b.blockRounds,
      counting: b.counting,
      wholeRun: b.wholeRun,
    })),
    finishedAt: attempt.finishedAt,
    breakdown: breakdownOf(rows, curve),
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
      answers: { select: { isCorrect: true, points: true } },
    },
    orderBy: { round: { index: "asc" } },
  });
  return attempts.map((a) => ({
    attemptId: a.id,
    round: a.round.index,
    category: a.round.category,
    score: a.score,
    correct: a.answers.filter((x) => x.isCorrect === true).length,
    total: a.answers.length,
    possible: a.answers.length,
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
