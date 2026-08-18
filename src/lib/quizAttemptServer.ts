import { prisma } from "./prisma";
import { requireCompetition } from "./competitionServer";
import { bandScore, type SpeedBand } from "./competitionConfig";
import { competitionDay, dayState, drawQuestions, seededShuffle } from "./quizDay";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { quiz } from "./messages";

export const NOT_OPEN = "المسابقة ليست مفتوحة الآن";
export const NO_POOL = "لا توجد أسئلة لهذا اليوم";
export const NOT_STARTED = "لم تنطلق المسابقة بعد";

export async function openCompetitionDay(now = new Date()) {
  const competition = await requireCompetition();
  if (!competition.startedAt) throw new ConflictError(NOT_STARTED);

  const window = {
    publishMinutes: competition.publishMinutes,
    cutoffMinutes: competition.cutoffMinutes,
  };
  const state = dayState(competition.startsOn, competition.days, window, now);
  if (state !== "open") throw new ConflictError(NOT_OPEN);

  const today = competitionDay(competition.startsOn, competition.days, now)!;
  const day = await prisma.quizDay.findUnique({
    where: { competitionId_day: { competitionId: competition.id, day: today.day } },
    include: { questions: { select: { questionId: true } } },
  });
  if (!day || day.questions.length === 0) throw new NotFoundError(NO_POOL);

  return { competition, day, index: today.index };
}

export async function startOrResumeAttempt(userId: string, now = new Date()) {
  const { competition, day } = await openCompetitionDay(now);

  const existing = await prisma.quizAttempt.findUnique({
    where: { dayId_userId: { dayId: day.id, userId } },
  });
  if (existing) return existing;

  const pool = day.questions.map((q) => q.questionId);
  const dayset = drawQuestions(pool, competition.servedCount, day.id);
  const drawn = seededShuffle(dayset, `${day.id}:${userId}`);

  const answers = await prisma.quizAnswer.findMany({
    where: { questionId: { in: drawn } },
    select: { id: true, questionId: true },
  });
  const byQuestion = new Map<string, string[]>();
  for (const a of answers) {
    byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a.id]);
  }

  return prisma.quizAttempt.create({
    data: {
      dayId: day.id,
      userId,
      answers: {
        create: drawn.map((questionId, position) => ({
          questionId,
          position,
          optionOrder: seededShuffle(
            byQuestion.get(questionId) ?? [],
            `${day.id}:${userId}:${questionId}`,
          ),
        })),
      },
    },
  });
}

export async function currentQuestion(attemptId: string, userId: string, now = new Date()) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
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
  const next = attempt.answers.find((a) => a.answeredAt === null);
  if (!next) return { attempt, done: true as const, total, position: total, question: null };

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
  const { competition } = await openCompetitionDay(now);

  const row = await prisma.quizAttemptAnswer.findUnique({
    where: { id: attemptAnswerId },
    include: {
      attempt: { select: { id: true, userId: true } },
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

  const valid = new Set(row.question.answers.map((a) => a.id));
  const picked = [...new Set(selectedAnswerIds)].filter((id) => valid.has(id));
  const correctIds = row.question.answers.filter((a) => a.isCorrect).map((a) => a.id);
  const isCorrect =
    picked.length === correctIds.length && picked.every((id) => correctIds.includes(id));

  const elapsedMs = row.shownAt ? Math.max(0, now.getTime() - row.shownAt.getTime()) : 0;
  const points = isCorrect
    ? bandScore(row.question.points, competition.speedBands as unknown as SpeedBand[], elapsedMs)
    : 0;

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

  return { isCorrect, points, correctIds, elapsedMs };
}

export async function closeExpiredAttempts(now = new Date()) {
  const competition = await prisma.competition.findFirst({ orderBy: { createdAt: "desc" } });
  if (!competition?.startedAt) return 0;

  const window = {
    publishMinutes: competition.publishMinutes,
    cutoffMinutes: competition.cutoffMinutes,
  };
  const today = competitionDay(competition.startsOn, competition.days, now);
  const state = dayState(competition.startsOn, competition.days, window, now);
  if (state !== "closed" || !today) return 0;

  const day = await prisma.quizDay.findUnique({
    where: { competitionId_day: { competitionId: competition.id, day: today.day } },
    select: { id: true },
  });
  if (!day) return 0;

  const { count } = await prisma.quizAttemptAnswer.updateMany({
    where: { answeredAt: null, attempt: { dayId: day.id } },
    data: { answeredAt: now, isCorrect: false, points: 0 },
  });
  await prisma.quizAttempt.updateMany({
    where: { dayId: day.id, finishedAt: null },
    data: { finishedAt: now },
  });
  return count;
}
