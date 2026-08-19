import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUsers, signInAs } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { POST as ATTEMPT } from "@/app/api/quiz/attempt/route";
import { POST as ANSWER } from "@/app/api/quiz/attempt/answer/route";

function startOfYesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function setup(paid = 100) {
  const c = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: startOfYesterday(),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      poolSize: 3,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
    },
  });
  const start = startOfYesterday();
  const days = await Promise.all(
    [0, 1, 2].map((index) =>
      prisma.quizRound.create({
        data: {
          competitionId: c.id,
          index,
          opensAt: new Date(start.getTime() + index * 1440 * 60_000),
          closesAt: new Date(start.getTime() + (index + 1) * 1440 * 60_000),
        },
      }),
    ),
  );
  for (let i = 0; i < 3; i++) {
    const q = await prisma.quizQuestion.create({
      data: {
        text: `سؤال ${i}`,
        category: "عام",
        createdBy: "admin",
        answers: {
          create: [
            { text: "صحيح", isCorrect: true, order: 0 },
            { text: "خطأ", isCorrect: false, order: 1 },
          ],
        },
      },
    });
    await prisma.quizRoundQuestion.createMany({
      data: days.map((d) => ({ roundId: d.id, questionId: q.id })),
    });
  }
  const [user] = await createUsers(1);
  await prisma.member.create({
    data: {
      userId: user.id,
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: paid,
    },
  });
  await signInAs(user);
  return { competition: c, user, days };
}

const startAttempt = (competitionId: string) =>
  ATTEMPT(post("/api/quiz/attempt", { competitionId }));
const answer = (answerId: string, selectedAnswerIds: string[]) =>
  ANSWER(post("/api/quiz/attempt/answer", { answerId, selectedAnswerIds }));

describe("a member playing the daily attempt", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is served the first question and nothing beyond it", async () => {
    const { competition } = await setup();

    const body = await (await startAttempt(competition.id)).json();

    expect(body.done).toBe(false);
    expect(body.position).toBe(0);
    expect(body.total).toBe(2);
    expect(body.question.options).toHaveLength(2);
    expect(body.question).not.toHaveProperty("isCorrect");
  });

  it("returns the same attempt when the app is reopened", async () => {
    const { competition } = await setup();
    const first = await (await startAttempt(competition.id)).json();

    const again = await (await startAttempt(competition.id)).json();

    expect(again.attemptId).toBe(first.attemptId);
    expect(again.position).toBe(0);
  });

  it("moves on and reports the score after an answer", async () => {
    const { competition } = await setup();
    const view = await (await startAttempt(competition.id)).json();
    const right = await prisma.quizAnswer.findFirstOrThrow({
      where: {
        id: { in: view.question.options.map((o: { id: string }) => o.id) },
        isCorrect: true,
      },
    });

    const body = await (await answer(view.question.answerId, [right.id])).json();

    expect(body.isCorrect).toBe(true);
    expect(body.points).toBeGreaterThan(0);
    expect(body.score).toBe(body.points);
    expect(body.position).toBe(1);
    expect(body.done).toBe(false);
  });

  it("says when the attempt is finished", async () => {
    const { competition } = await setup();
    for (let i = 0; i < 2; i++) {
      const view = await (await startAttempt(competition.id)).json();
      const right = await prisma.quizAnswer.findFirstOrThrow({
        where: {
          id: { in: view.question.options.map((o: { id: string }) => o.id) },
          isCorrect: true,
        },
      });
      const body = await (await answer(view.question.answerId, [right.id])).json();
      if (i === 1) expect(body.done).toBe(true);
    }

    const after = await (await startAttempt(competition.id)).json();
    expect(after.done).toBe(true);
    expect(after.question).toBeNull();
  });

  it("refuses a second answer to the same question", async () => {
    const { competition } = await setup();
    const view = await (await startAttempt(competition.id)).json();
    const option = view.question.options[0].id;
    await answer(view.question.answerId, [option]);

    expect((await answer(view.question.answerId, [option])).status).toBe(409);
  });

  it("refuses an empty answer", async () => {
    const { competition } = await setup();
    const view = await (await startAttempt(competition.id)).json();

    expect((await answer(view.question.answerId, [])).status).toBe(400);
  });

  it("is closed to a member who has not paid", async () => {
    const { competition } = await setup(0);

    expect((await startAttempt(competition.id)).status).toBe(403);
  });

  it("is closed to a member who was not invited to a private competition", async () => {
    const { competition } = await setup();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { visibility: "PRIVATE" },
    });

    expect((await startAttempt(competition.id)).status).toBe(403);
  });

  it("opens once the member is on the private list", async () => {
    const { competition, user } = await setup();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { visibility: "PRIVATE" },
    });
    await prisma.quizParticipant.create({
      data: { competitionId: competition.id, userId: user.id },
    });

    expect((await startAttempt(competition.id)).status).toBe(200);
  });

  it("hands back one attempt when two requests race", async () => {
    const { competition } = await setup();

    const [one, two] = await Promise.all([
      startAttempt(competition.id),
      startAttempt(competition.id),
    ]);

    expect(one.status).toBe(200);
    expect(two.status).toBe(200);
    expect((await one.json()).attemptId).toBe((await two.json()).attemptId);
    expect(await prisma.quizAttempt.count()).toBe(1);
  });

  it("pays the whole question for a fast right answer", async () => {
    const { competition } = await setup();
    const view = await (await startAttempt(competition.id)).json();
    const right = await prisma.quizAnswer.findFirstOrThrow({
      where: {
        id: { in: view.question.options.map((o: { id: string }) => o.id) },
        isCorrect: true,
      },
    });

    const body = await (await answer(view.question.answerId, [right.id])).json();

    expect(body.points).toBe(view.question.points);
  });

  it("hands the member the curve so the timer knows what to show", async () => {
    const { competition } = await setup();

    const body = await (await startAttempt(competition.id)).json();

    expect(body.curve).toEqual({ fullSeconds: 10, maxSeconds: 30, floorPercent: 50 });
    expect(body.question.shownAt).toBeDefined();
  });

  it("refuses an attempt with no competition named", async () => {
    await setup();

    expect((await ATTEMPT(post("/api/quiz/attempt", {}))).status).toBe(400);
  });

  it("counts towards the member's streak", async () => {
    const { competition, user } = await setup();
    const view = await (await startAttempt(competition.id)).json();

    await answer(view.question.answerId, [view.question.options[0].id]);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.currentStreak).toBeGreaterThan(0);
  });
});
