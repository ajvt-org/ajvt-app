import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { breakdownOf, roundEntries, type AnswerRow, type Breakdown } from "./quizBreakdown";
import { getCompetition, shapeOf } from "./competitionServer";
import { roundWindows } from "./quizRound";
import type { ScoreCurve } from "./competitionConfig";

export const NO_ATTEMPT = "لا توجد محاولة";
export const ROUND_STILL_OPEN = "تفاصيل الإجابات تظهر بعد إغلاق الجولة";

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

export async function attemptsOf(competitionId: string, userId: string, now = new Date()) {
  const competition = await getCompetition(competitionId);
  if (!competition?.startedAt) return [];

  const [attempts, rounds] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, round: { competitionId } },
      select: {
        id: true,
        score: true,
        finishedAt: true,
        round: { select: { index: true, category: true } },
        answers: { select: { isCorrect: true, points: true } },
      },
    }),
    prisma.quizRound.findMany({
      where: { competitionId },
      select: { index: true, category: true },
    }),
  ]);
  const byRound = new Map(attempts.map((a) => [a.round.index, a]));
  const categoryOf = new Map(rounds.map((r) => [r.index, r.category]));

  return roundEntries(roundWindows(shapeOf(competition)), byRound, now).map(
    ({ window, attempt }) =>
      attempt
        ? {
            attemptId: attempt.id as string | null,
            round: window.index,
            category: attempt.round.category,
            score: attempt.score,
            correct: attempt.answers.filter((x) => x.isCorrect === true).length,
            total: attempt.answers.length,
            possible: attempt.answers.length,
            finishedAt: attempt.finishedAt,
            missed: false,
            closed: window.closesAt <= now,
          }
        : {
            attemptId: null,
            round: window.index,
            category: categoryOf.get(window.index) ?? null,
            score: 0,
            correct: 0,
            total: 0,
            possible: 0,
            finishedAt: null,
            missed: true,
            closed: window.closesAt <= now,
          },
  );
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
