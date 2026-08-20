import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { NOT_MISSED, ROUND_CLOSED } from "@/lib/quizAttemptServer";
import { resetDb, post, createUser, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as REOPEN } from "@/app/api/admin/quiz/attempts/[id]/reopen/route";

const START = new Date("2026-08-20T08:00:00.000Z");
const PERIOD = 1440 * 60_000;

type AnswerState = {
  answeredAt: Date | null;
  isCorrect: boolean | null;
  points: number;
  shownAt?: Date | null;
};

async function attemptWith(answers: AnswerState[], closesAt = new Date(Date.now() + PERIOD)) {
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: answers.length,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
  const round = await prisma.quizRound.create({
    data: { competitionId: competition.id, index: 0, opensAt: START, closesAt },
  });
  const question = await prisma.quizQuestion.create({
    data: { text: "سؤال", category: "عام", points: 10, correctCount: 1, createdBy: "admin" },
  });
  const user = await createUser("22334455");
  const attempt = await prisma.quizAttempt.create({
    data: {
      roundId: round.id,
      userId: user.id,
      score: answers.reduce((sum, a) => sum + a.points, 0),
      finishedAt: answers.every((a) => a.answeredAt) ? new Date() : null,
      answers: {
        create: answers.map((a, position) => ({
          questionId: question.id,
          position,
          shownAt: a.shownAt === undefined ? START : a.shownAt,
          elapsedMs: 30_000,
          selectedAnswerIds: a.isCorrect === null ? [] : ["x"],
          answeredAt: a.answeredAt,
          isCorrect: a.isCorrect,
          points: a.points,
        })),
      },
    },
  });
  return { attempt, user };
}

const answered = { answeredAt: START, isCorrect: true, points: 10 };
const missed = { answeredAt: START, isCorrect: null, points: 0 };
const stranded = { answeredAt: null, isCorrect: null, points: 0 };
const live = { answeredAt: null, isCorrect: null, points: 0, shownAt: null };

const reopen = (id: string) =>
  REOPEN(post(`/api/admin/quiz/attempts/${id}/reopen`, {}), withId(id));

async function refusal(res: Response): Promise<string> {
  return (await res.json()).error;
}

describe("reopening the questions a member never answered", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("clears the missed questions and keeps what was earned", async () => {
    const { attempt } = await attemptWith([answered, missed, missed]);

    const res = await reopen(attempt.id);

    expect(res.status).toBe(200);
    expect((await res.json()).reopened).toBe(2);
    const rows = await prisma.quizAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      orderBy: { position: "asc" },
    });
    expect(rows[0]).toMatchObject({ isCorrect: true, points: 10 });
    expect(rows[1]).toMatchObject({ answeredAt: null, shownAt: null, elapsedMs: null, points: 0 });
    expect(rows[1].selectedAnswerIds).toEqual([]);
  });

  it("gives the member the round back by clearing the finish mark", async () => {
    const { attempt } = await attemptWith([answered, missed]);

    await reopen(attempt.id);

    const after = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(after.finishedAt).toBeNull();
    expect(after.score).toBe(10);
  });

  it("gives back a question whose clock ran out while the member was away", async () => {
    const { attempt } = await attemptWith([answered, stranded]);

    const res = await reopen(attempt.id);

    expect((await res.json()).reopened).toBe(1);
    const rows = await prisma.quizAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      orderBy: { position: "asc" },
    });
    expect(rows[1].shownAt).toBeNull();
  });

  it("leaves a question nobody has opened yet alone", async () => {
    const { attempt } = await attemptWith([missed, live]);

    const res = await reopen(attempt.id);

    expect((await res.json()).reopened).toBe(1);
  });

  it("leaves the question the member is answering right now alone", async () => {
    const { attempt } = await attemptWith([missed, { ...live, shownAt: new Date() }]);

    const res = await reopen(attempt.id);

    expect((await res.json()).reopened).toBe(1);
    const rows = await prisma.quizAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      orderBy: { position: "asc" },
    });
    expect(rows[1].shownAt).not.toBeNull();
  });

  it("refuses an attempt with nothing missed", async () => {
    const { attempt } = await attemptWith([answered, answered]);

    const res = await reopen(attempt.id);

    expect(res.status).toBe(409);
    expect(await refusal(res)).toBe(NOT_MISSED);
  });

  it("refuses once the round has closed", async () => {
    const { attempt } = await attemptWith([answered, missed], new Date(START.getTime() - 1000));

    const res = await reopen(attempt.id);

    expect(res.status).toBe(409);
    expect(await refusal(res)).toBe(ROUND_CLOSED);
  });

  it("is closed to an admin who is not SUPER", async () => {
    const { attempt } = await attemptWith([answered, missed]);
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));

    expect((await reopen(attempt.id)).status).toBe(403);
  });

  it("writes what it did to the audit log", async () => {
    const { attempt, user } = await attemptWith([answered, missed]);

    await reopen(attempt.id);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "REOPEN_QUIZ_ATTEMPT" },
    });
    expect(entry.targetId).toBe(attempt.id);
    expect(JSON.stringify(entry.meta)).toContain(user.id);
  });
});
