import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";
import {
  startOrResumeAttempt,
  currentQuestion,
  submitAnswer,
  closeExpiredAttempts,
  NOT_OPEN,
  NO_POOL,
  NOT_STARTED,
} from "@/lib/quizAttemptServer";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";
import type { HttpError } from "@/lib/errors";

async function refusal(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "";
  } catch (e) {
    return (e as HttpError).clientMessage;
  }
}

const DAY = "2026-08-20";
const openAt = new Date(`${DAY}T10:00:00.000Z`);

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsOn: DAY,
      days: 30,
      publishMinutes: 480,
      cutoffMinutes: 1320,
      servedCount: 3,
      poolSize: 5,
      weeklyCountingDays: 6,
      speedBands: DEFAULT_BANDS,
      startedAt: new Date(`${DAY}T00:00:00.000Z`),
      ...over,
    },
  });
}

async function pool(competitionId: string, size = 5) {
  const day = await prisma.quizDay.create({ data: { competitionId, day: DAY } });
  for (let i = 0; i < size; i++) {
    const q = await prisma.quizQuestion.create({
      data: {
        text: `سؤال ${i}`,
        category: "عام",
        points: 10,
        correctCount: 1,
        createdBy: "admin",
        answers: {
          create: [
            { text: "صحيح", isCorrect: true, order: 0 },
            { text: "خطأ أ", isCorrect: false, order: 1 },
            { text: "خطأ ب", isCorrect: false, order: 2 },
          ],
        },
      },
    });
    await prisma.quizDayQuestion.create({ data: { dayId: day.id, questionId: q.id } });
  }
  return day;
}

const user = () =>
  prisma.user.create({ data: { phone: `2${Date.now() % 9999999}`, password: "x" } });

describe("starting a daily attempt", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses before the competition is launched", async () => {
    const c = await competition({ startedAt: null });
    await pool(c.id);
    const u = await user();

    expect(await refusal(() => startOrResumeAttempt(u.id, openAt))).toBe(NOT_STARTED);
  });

  it("refuses before the day opens", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();

    expect(await refusal(() => startOrResumeAttempt(u.id, new Date(`${DAY}T07:00:00.000Z`)))).toBe(
      NOT_OPEN,
    );
  });

  it("refuses after the cutoff", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();

    expect(await refusal(() => startOrResumeAttempt(u.id, new Date(`${DAY}T23:00:00.000Z`)))).toBe(
      NOT_OPEN,
    );
  });

  it("refuses on a day with no pool loaded", async () => {
    const c = await competition();
    await prisma.quizDay.create({ data: { competitionId: c.id, day: DAY } });
    const u = await user();

    expect(await refusal(() => startOrResumeAttempt(u.id, openAt))).toBe(NO_POOL);
  });

  it("draws the number of questions the competition serves", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();

    const attempt = await startOrResumeAttempt(u.id, openAt);

    const rows = await prisma.quizAttemptAnswer.findMany({ where: { attemptId: attempt.id } });
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.questionId)).size).toBe(3);
  });

  it("shuffles the options for that member", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();

    const attempt = await startOrResumeAttempt(u.id, openAt);

    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id },
    });
    expect(row.optionOrder).toHaveLength(3);
  });

  it("gives two members different draws", async () => {
    const c = await competition();
    await pool(c.id, 5);
    const [a, b] = [await user(), await user()];

    const one = await startOrResumeAttempt(a.id, openAt);
    const two = await startOrResumeAttempt(b.id, openAt);

    const rowsA = await prisma.quizAttemptAnswer.findMany({ where: { attemptId: one.id } });
    const rowsB = await prisma.quizAttemptAnswer.findMany({ where: { attemptId: two.id } });
    expect(rowsA.map((r) => r.questionId).sort()).not.toEqual(
      rowsB.map((r) => r.questionId).sort(),
    );
  });

  it("resumes the same attempt rather than starting a second", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();

    const first = await startOrResumeAttempt(u.id, openAt);
    const again = await startOrResumeAttempt(u.id, new Date(`${DAY}T11:00:00.000Z`));

    expect(again.id).toBe(first.id);
    expect(await prisma.quizAttempt.count()).toBe(1);
    expect(await prisma.quizAttemptAnswer.count()).toBe(3);
  });
});

describe("working through an attempt", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function ready() {
    const c = await competition();
    await pool(c.id);
    const u = await user();
    const attempt = await startOrResumeAttempt(u.id, openAt);
    return { c, u, attempt };
  }

  it("serves one question at a time, from the start", async () => {
    const { u, attempt } = await ready();

    const view = await currentQuestion(attempt.id, u.id, openAt);

    expect(view.done).toBe(false);
    expect(view.position).toBe(0);
    expect(view.total).toBe(3);
    expect(view.question?.options).toHaveLength(3);
  });

  it("starts the timer when the question is first shown", async () => {
    const { u, attempt } = await ready();

    await currentQuestion(attempt.id, u.id, openAt);

    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
    });
    expect(row.shownAt).not.toBeNull();
  });

  it("does not restart the timer when the member comes back", async () => {
    const { u, attempt } = await ready();
    await currentQuestion(attempt.id, u.id, openAt);
    const first = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
    });

    await currentQuestion(attempt.id, u.id, new Date(`${DAY}T10:05:00.000Z`));

    const again = await prisma.quizAttemptAnswer.findFirstOrThrow({ where: { id: first.id } });
    expect(again.shownAt?.getTime()).toBe(first.shownAt?.getTime());
  });

  it("belongs to nobody else", async () => {
    const { attempt } = await ready();
    const other = await user();

    await expect(currentQuestion(attempt.id, other.id, openAt)).rejects.toThrow();
  });

  it("scores a correct answer by its speed band", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);
    const correct = await prisma.quizAnswer
      .findFirstOrThrow({
        where: { questionId: { in: [] }, isCorrect: true },
      })
      .catch(() => null);
    void correct;
    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
      include: { question: { select: { answers: true } } },
    });
    const right = row.question.answers.find((a) => a.isCorrect)!;

    const result = await submitAnswer(
      view.question!.answerId,
      u.id,
      [right.id],
      new Date(openAt.getTime() + 5_000),
    );

    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(10);
    expect(result.elapsedMs).toBe(5_000);
  });

  it("pays a lower band for a slower answer", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);
    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
      include: { question: { select: { answers: true } } },
    });
    const right = row.question.answers.find((a) => a.isCorrect)!;

    const result = await submitAnswer(
      view.question!.answerId,
      u.id,
      [right.id],
      new Date(openAt.getTime() + 45_000),
    );

    expect(result.points).toBe(5);
  });

  it("pays nothing for a wrong answer", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);
    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
      include: { question: { select: { answers: true } } },
    });
    const wrong = row.question.answers.find((a) => !a.isCorrect)!;

    const result = await submitAnswer(view.question!.answerId, u.id, [wrong.id], openAt);

    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it("refuses a second answer to the same question", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);
    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
      include: { question: { select: { answers: true } } },
    });
    const right = row.question.answers.find((a) => a.isCorrect)!;
    await submitAnswer(view.question!.answerId, u.id, [right.id], openAt);

    await expect(submitAnswer(view.question!.answerId, u.id, [right.id], openAt)).rejects.toThrow();
  });

  it("moves on to the next question once one is answered", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);
    const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
      where: { attemptId: attempt.id, position: 0 },
      include: { question: { select: { answers: true } } },
    });
    await submitAnswer(view.question!.answerId, u.id, [row.question.answers[0].id], openAt);

    const next = await currentQuestion(attempt.id, u.id, openAt);
    expect(next.position).toBe(1);
  });

  it("finishes the attempt when the last question is answered", async () => {
    const { u, attempt } = await ready();
    for (let i = 0; i < 3; i++) {
      const view = await currentQuestion(attempt.id, u.id, openAt);
      const row = await prisma.quizAttemptAnswer.findFirstOrThrow({
        where: { id: view.question!.answerId },
        include: { question: { select: { answers: true } } },
      });
      const right = row.question.answers.find((a) => a.isCorrect)!;
      await submitAnswer(view.question!.answerId, u.id, [right.id], openAt);
    }

    const done = await currentQuestion(attempt.id, u.id, openAt);
    expect(done.done).toBe(true);
    const finished = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.score).toBe(30);
  });

  it("refuses an answer once the day has closed", async () => {
    const { u, attempt } = await ready();
    const view = await currentQuestion(attempt.id, u.id, openAt);

    expect(
      await refusal(() =>
        submitAnswer(view.question!.answerId, u.id, [], new Date(`${DAY}T23:00:00.000Z`)),
      ),
    ).toBe(NOT_OPEN);
  });
});

describe("closing the day", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("scores whatever is unanswered as wrong once the cutoff passes", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();
    const attempt = await startOrResumeAttempt(u.id, openAt);

    const closed = await closeExpiredAttempts(new Date(`${DAY}T23:00:00.000Z`));

    expect(closed).toBe(3);
    const rows = await prisma.quizAttemptAnswer.findMany({ where: { attemptId: attempt.id } });
    expect(rows.every((r) => r.isCorrect === false && r.points === 0)).toBe(true);
    expect(
      (await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).finishedAt,
    ).not.toBeNull();
  });

  it("does nothing while the day is still open", async () => {
    const c = await competition();
    await pool(c.id);
    const u = await user();
    await startOrResumeAttempt(u.id, openAt);

    expect(await closeExpiredAttempts(openAt)).toBe(0);
  });
});
