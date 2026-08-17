import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ANSWER_WINDOW_SECONDS } from "@/lib/quizWindow";
import { DEFAULT_MIN_SHARE } from "@/lib/quizScore";
import { resetDb, post, createUser, signInAs } from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { POST: ANSWER } = await import("@/app/api/quiz/answer/route");

async function eligibleUser() {
  const user = await createUser("22000030");
  await prisma.member.create({
    data: {
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      userId: user.id,
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
  await signInAs(user);
  return user;
}

async function revealedSecondsAgo(userId: string, seconds: number) {
  const question = await prisma.quizQuestion.create({
    data: {
      text: "سؤال",
      category: "عام",
      points: 100,
      createdBy: "admin",
      answers: {
        create: [
          { text: "صحيح", isCorrect: true, order: 0 },
          { text: "خاطئ", isCorrect: false, order: 1 },
        ],
      },
    },
    include: { answers: true },
  });
  const assignment = await prisma.quizAssignment.create({
    data: {
      userId,
      questionId: question.id,
      batchId: "b1",
      mode: "SAME",
      revealedAt: new Date(Date.now() - seconds * 1000),
    },
  });
  return { question, assignment };
}

async function answerCorrectly(userId: string, seconds: number) {
  const { question, assignment } = await revealedSecondsAgo(userId, seconds);
  const correct = question.answers.find((a) => a.isCorrect)!;
  return (
    await ANSWER(
      post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [correct.id] }),
    )
  ).json();
}

describe("scoring by response time", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("pays close to full for an answer straight after the reveal", async () => {
    const user = await eligibleUser();

    const body = await answerCorrectly(user.id, 0);

    expect(body.isCorrect).toBe(true);
    expect(body.pointsAwarded).toBeGreaterThan(95);
    expect(body.maxPoints).toBe(100);
  });

  it("pays less for a slower answer in the same window", async () => {
    const user = await eligibleUser();

    const quick = await answerCorrectly(user.id, 1);
    const slow = await answerCorrectly(user.id, 8);

    expect(slow.pointsAwarded).toBeLessThan(quick.pointsAwarded);
  });

  it("still pays the floor for a right answer at the deadline", async () => {
    const user = await eligibleUser();

    const body = await answerCorrectly(user.id, DEFAULT_ANSWER_WINDOW_SECONDS);

    expect(body.pointsAwarded).toBe(100 * DEFAULT_MIN_SHARE);
  });

  it("reports how long the member took, from the server clock", async () => {
    const user = await eligibleUser();

    const body = await answerCorrectly(user.id, 3);

    expect(body.answeredInMs).toBeGreaterThanOrEqual(3000);
    expect(body.answeredInMs).toBeLessThan(5000);
  });

  it("pays nothing for a wrong answer however fast", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await revealedSecondsAgo(user.id, 0);
    const wrong = question.answers.find((a) => !a.isCorrect)!;

    const body = await (
      await ANSWER(
        post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [wrong.id] }),
      )
    ).json();

    expect(body).toMatchObject({ isCorrect: false, pointsAwarded: 0 });
  });

  it("records the awarded points on the assignment, so the leaderboard follows", async () => {
    const user = await eligibleUser();

    const body = await answerCorrectly(user.id, 1);

    const row = await prisma.quizAssignment.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.pointsAwarded).toBe(body.pointsAwarded);
  });
});
