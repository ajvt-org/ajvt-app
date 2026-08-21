import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { ROUND_STILL_OPEN } from "@/lib/quizBreakdownServer";
import { resetDb, get, createUser, signInAs, withParams } from "./helpers";

import { GET as REVIEW } from "@/app/api/quiz/breakdown/[attemptId]/route";
import { GET as ROUNDS } from "@/app/api/quiz/breakdown/route";

const START = new Date(Date.now() - 3 * 86_400_000);
const PERIOD = 1440 * 60_000;

async function paidMember(phone: string) {
  const user = await createUser(phone);
  await prisma.member.create({
    data: {
      userId: user.id,
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
  return user;
}

async function playedRound({ closed }: { closed: boolean }) {
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 5,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: closed ? 60 : 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
  const opensAt = closed ? START : new Date(Date.now() - 60_000);
  const round = await prisma.quizRound.create({
    data: {
      competitionId: competition.id,
      index: 0,
      opensAt,
      closesAt: new Date(opensAt.getTime() + (closed ? 3_600_000 : PERIOD)),
    },
  });
  const question = await prisma.quizQuestion.create({
    data: {
      text: "ما عاصمة موريتانيا؟",
      category: "جغرافيا",
      points: 10,
      correctCount: 1,
      createdBy: "admin",
      answers: {
        create: [
          { text: "نواكشوط", isCorrect: true, order: 0 },
          { text: "روصو", isCorrect: false, order: 1 },
        ],
      },
    },
    include: { answers: true },
  });
  const user = await paidMember("22334455");
  const attempt = await prisma.quizAttempt.create({
    data: {
      roundId: round.id,
      userId: user.id,
      score: 10,
      finishedAt: new Date(),
      answers: {
        create: [
          {
            questionId: question.id,
            position: 0,
            shownAt: opensAt,
            answeredAt: opensAt,
            selectedAnswerIds: [question.answers[0].id],
            isCorrect: true,
            elapsedMs: 4000,
            points: 10,
          },
          {
            questionId: question.id,
            position: 1,
            shownAt: opensAt,
            answeredAt: opensAt,
            selectedAnswerIds: [],
            isCorrect: null,
            elapsedMs: 30_000,
            points: 0,
          },
        ],
      },
    },
  });
  return { competition, attempt, user };
}

const review = (attemptId: string) =>
  REVIEW(get(`/api/quiz/breakdown/${attemptId}`), withParams({ attemptId }));

describe("the answers a member reads back", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("shows the questions once the round has closed", async () => {
    const { attempt, user } = await playedRound({ closed: true });
    await signInAs(user);

    const res = await review(attempt.id);

    expect(res.status).toBe(200);
    const { detail } = await res.json();
    expect(detail.breakdown.rows).toHaveLength(2);
    expect(detail.breakdown.rows[0].chosen).toEqual(["نواكشوط"]);
    expect(detail.breakdown.rows[0].correct).toEqual(["نواكشوط"]);
    expect(detail.breakdown.rows[1].isCorrect).toBeNull();
  });

  it("keeps them hidden while the round is still open", async () => {
    const { attempt, user } = await playedRound({ closed: false });
    await signInAs(user);

    const res = await review(attempt.id);

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(ROUND_STILL_OPEN);
  });

  it("hides another member's answers behind a not found", async () => {
    const { attempt } = await playedRound({ closed: true });
    await signInAs(await paidMember("33445566"));

    expect((await review(attempt.id)).status).toBe(404);
  });

  it("refuses a visitor with no session", async () => {
    const { attempt } = await playedRound({ closed: true });

    expect((await review(attempt.id)).status).toBe(401);
  });

  it("marks a closed round in the list so the member knows it can be opened", async () => {
    const { competition, user } = await playedRound({ closed: true });
    await signInAs(user);

    const res = await ROUNDS(get(`/api/quiz/breakdown?competition=${competition.id}`));

    const { rounds } = await res.json();
    expect(rounds[0].closed).toBe(true);
  });
});
