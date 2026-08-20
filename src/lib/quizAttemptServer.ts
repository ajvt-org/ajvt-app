import { prisma } from "./prisma";
import { getQuizSettings } from "./quiz";
import { requireCompetition, shapeOf } from "./competitionServer";
import { curveScore, type ScoreCurve } from "./competitionConfig";
import { currentRound, drawQuestions, seededShuffle } from "./quizRound";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { isUniqueViolation } from "./prismaError";
import { quiz } from "./messages";

export const NOT_OPEN = "المسابقة ليست مفتوحة الآن";
export const NO_POOL = "لا توجد أسئلة لهذه الجولة";
export const NOT_STARTED = "لم تنطلق المسابقة بعد";

export function curveOf(competition: ScoreCurve): ScoreCurve {
  return {
    fullSeconds: competition.fullSeconds,
    maxSeconds: competition.maxSeconds,
    floorPercent: competition.floorPercent,
  };
}

export async function openCompetitionRound(competitionId: string, now = new Date()) {
  const competition = await requireCompetition(competitionId);
  if (!competition.startedAt) throw new ConflictError(NOT_STARTED);

  const open = currentRound(shapeOf(competition), now);
  if (!open) throw new ConflictError(NOT_OPEN);

  const round = await prisma.quizRound.findUnique({
    where: { competitionId_index: { competitionId: competition.id, index: open.index } },
    include: { questions: { select: { questionId: true } } },
  });
  if (!round || round.questions.length === 0) throw new NotFoundError(NO_POOL);

  return { competition, round, index: open.index };
}

export async function startOrResumeAttempt(
  competitionId: string,
  userId: string,
  now = new Date(),
) {
  const { competition, round } = await openCompetitionRound(competitionId, now);

  if (round.confirmAnswers === null) {
    await prisma.quizRound.updateMany({
      where: { id: round.id, confirmAnswers: null },
      data: { confirmAnswers: (await getQuizSettings()).confirmAnswers },
    });
  }

  const existing = await prisma.quizAttempt.findUnique({
    where: { roundId_userId: { roundId: round.id, userId } },
  });
  if (existing) return existing;

  const pool = round.questions.map((q) => q.questionId);
  const roundSet = drawQuestions(pool, competition.servedCount, round.id);
  const drawn = seededShuffle(roundSet, `${round.id}:${userId}`);

  const answers = await prisma.quizAnswer.findMany({
    where: { questionId: { in: drawn } },
    select: { id: true, questionId: true },
  });
  const byQuestion = new Map<string, string[]>();
  for (const a of answers) {
    byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a.id]);
  }

  try {
    return await prisma.quizAttempt.create({
      data: {
        roundId: round.id,
        userId,
        answers: {
          create: drawn.map((questionId, position) => ({
            questionId,
            position,
            optionOrder: seededShuffle(
              byQuestion.get(questionId) ?? [],
              `${round.id}:${userId}:${questionId}`,
            ),
          })),
        },
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return prisma.quizAttempt.findUniqueOrThrow({
      where: { roundId_userId: { roundId: round.id, userId } },
    });
  }
}

async function expireOverdue(
  attemptId: string,
  rows: { id: string; shownAt: Date | null; answeredAt: Date | null }[],
  curve: ScoreCurve,
  now: Date,
): Promise<Set<string>> {
  const overdue = rows.filter(
    (row) =>
      row.answeredAt === null &&
      row.shownAt !== null &&
      now.getTime() - row.shownAt.getTime() > curve.maxSeconds * 1000,
  );
  if (overdue.length === 0) return new Set();

  await prisma.quizAttemptAnswer.updateMany({
    where: { id: { in: overdue.map((row) => row.id) } },
    data: { answeredAt: now, isCorrect: null, points: 0, elapsedMs: curve.maxSeconds * 1000 },
  });
  await settleAttempt(attemptId, now);
  return new Set(overdue.map((row) => row.id));
}

async function settleAttempt(attemptId: string, now: Date) {
  const totals = await prisma.quizAttemptAnswer.aggregate({
    where: { attemptId },
    _sum: { points: true },
  });
  const remaining = await prisma.quizAttemptAnswer.count({
    where: { attemptId, answeredAt: null },
  });
  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { score: totals._sum.points ?? 0, finishedAt: remaining === 0 ? now : null },
  });
}

export async function currentQuestion(attemptId: string, userId: string, now = new Date()) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      round: { include: { competition: true } },
      answers: {
        orderBy: { position: "asc" },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              category: true,
              points: true,
              correctCount: true,
              answers: { select: { id: true, text: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) throw new NotFoundError(quiz.questionNotFound);
  if (attempt.userId !== userId) throw new ForbiddenError();

  const total = attempt.answers.length;
  const curve = curveOf(attempt.round.competition);
  const confirm = attempt.round.confirmAnswers ?? true;
  const expired = await expireOverdue(attempt.id, attempt.answers, curve, now);
  const next = attempt.answers.find((a) => a.answeredAt === null && !expired.has(a.id));
  if (!next) {
    return { attempt, done: true as const, total, position: total, curve, confirm, question: null };
  }

  if (!next.shownAt && attempt.round.closesAt.getTime() <= now.getTime()) {
    const left = attempt.answers.filter((a) => a.answeredAt === null && !expired.has(a.id));
    await prisma.quizAttemptAnswer.updateMany({
      where: { id: { in: left.map((a) => a.id) } },
      data: { answeredAt: now, isCorrect: null, points: 0 },
    });
    await settleAttempt(attempt.id, now);
    return { attempt, done: true as const, total, position: total, curve, confirm, question: null };
  }

  if (!next.shownAt) {
    await prisma.quizAttemptAnswer.update({
      where: { id: next.id },
      data: { shownAt: now },
    });
    next.shownAt = now;
  }

  const options = next.optionOrder
    .map((id) => next.question.answers.find((a) => a.id === id))
    .filter((a): a is { id: string; text: string } => !!a);

  return {
    attempt,
    done: false as const,
    total,
    curve,
    confirm,
    position: next.position,
    question: {
      answerId: next.id,
      text: next.question.text,
      category: next.question.category,
      points: next.question.points,
      correctCount: next.question.correctCount,
      shownAt: next.shownAt,
      options,
    },
  };
}

export async function submitAnswer(
  attemptAnswerId: string,
  userId: string,
  selectedAnswerIds: string[],
  now = new Date(),
) {
  const row = await prisma.quizAttemptAnswer.findUnique({
    where: { id: attemptAnswerId },
    include: {
      attempt: {
        select: { id: true, userId: true, round: { select: { competition: true } } },
      },
      question: {
        select: {
          points: true,
          correctCount: true,
          answers: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });
  if (!row) throw new NotFoundError(quiz.questionNotFound);
  if (row.attempt.userId !== userId) throw new ForbiddenError();
  if (row.answeredAt) throw new ConflictError(quiz.alreadyAnswered);

  const curve = curveOf(row.attempt.round.competition);
  const spent = row.shownAt ? Math.max(0, now.getTime() - row.shownAt.getTime()) : 0;
  if (spent > curve.maxSeconds * 1000) {
    await prisma.quizAttemptAnswer.update({
      where: { id: row.id },
      data: {
        answeredAt: now,
        isCorrect: null,
        points: 0,
        elapsedMs: curve.maxSeconds * 1000,
      },
    });
    await settleAttempt(row.attempt.id, now);
    return { isCorrect: false, points: 0, correctIds: [], elapsedMs: spent, expired: true };
  }

  const valid = new Set(row.question.answers.map((a) => a.id));
  const picked = [...new Set(selectedAnswerIds)].filter((id) => valid.has(id));
  const correctIds = row.question.answers.filter((a) => a.isCorrect).map((a) => a.id);
  const isCorrect =
    picked.length === correctIds.length && picked.every((id) => correctIds.includes(id));

  const elapsedMs = spent;
  const points = isCorrect ? curveScore(row.question.points, curve, elapsedMs) : 0;

  await prisma.$transaction(async (tx) => {
    await tx.quizAttemptAnswer.update({
      where: { id: row.id },
      data: { answeredAt: now, selectedAnswerIds: picked, isCorrect, elapsedMs, points },
    });
    const totals = await tx.quizAttemptAnswer.aggregate({
      where: { attemptId: row.attempt.id },
      _sum: { points: true },
      _count: { answeredAt: true },
    });
    const remaining = await tx.quizAttemptAnswer.count({
      where: { attemptId: row.attempt.id, answeredAt: null },
    });
    await tx.quizAttempt.update({
      where: { id: row.attempt.id },
      data: {
        score: totals._sum.points ?? 0,
        finishedAt: remaining === 0 ? now : null,
      },
    });
  });

  return { isCorrect, points, correctIds, elapsedMs, expired: false };
}

export async function closeExpiredAttempts(now = new Date()) {
  const stale = await prisma.quizRound.findMany({
    where: {
      competition: { startedAt: { not: null } },
      closesAt: { lte: now },
      attempts: { some: { finishedAt: null } },
    },
    select: { id: true, competition: { select: { maxSeconds: true } } },
  });
  if (stale.length === 0) return 0;

  let count = 0;
  for (const round of stale) {
    const cutoff = new Date(now.getTime() - round.competition.maxSeconds * 1000);
    const zeroed = await prisma.quizAttemptAnswer.updateMany({
      where: {
        answeredAt: null,
        attempt: { roundId: round.id },
        OR: [{ shownAt: null }, { shownAt: { lte: cutoff } }],
      },
      data: { answeredAt: now, isCorrect: null, points: 0 },
    });
    count += zeroed.count;
    await prisma.quizAttempt.updateMany({
      where: { roundId: round.id, finishedAt: null, answers: { none: { answeredAt: null } } },
      data: { finishedAt: now },
    });
  }
  return count;
}
