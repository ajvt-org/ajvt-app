import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ANSWER_WINDOW_SECONDS, GRACE_MS } from "@/lib/quizWindow";
import { resetDb, post, createUser, signInAs } from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { GET: QUIZ_ME } = await import("@/app/api/quiz/me/route");
const { POST: ANSWER } = await import("@/app/api/quiz/answer/route");

async function eligibleUser() {
  const user = await createUser("22000020");
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

async function revealedAssignment(userId: string, revealedAt: Date) {
  const question = await prisma.quizQuestion.create({
    data: {
      text: "سؤال",
      category: "عام",
      points: 10,
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
    data: { userId, questionId: question.id, batchId: "b1", mode: "SAME", revealedAt },
  });
  return { question, assignment };
}

function answer(assignmentId: string, selectedAnswerIds: string[]) {
  return ANSWER(post("/api/quiz/answer", { assignmentId, selectedAnswerIds }));
}

const agesAgo = () =>
  new Date(Date.now() - (DEFAULT_ANSWER_WINDOW_SECONDS * 1000 + GRACE_MS + 5000));

describe("the answer window", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("awards a correct answer inside the window", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await revealedAssignment(user.id, new Date());
    const correct = question.answers.find((a) => a.isCorrect)!;

    const body = await (await answer(assignment.id, [correct.id])).json();

    expect(body).toMatchObject({ isCorrect: true, pointsAwarded: 10, expired: false });
  });

  it("refuses a correct answer that arrives after the window", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await revealedAssignment(user.id, agesAgo());
    const correct = question.answers.find((a) => a.isCorrect)!;

    const body = await (await answer(assignment.id, [correct.id])).json();

    expect(body).toMatchObject({ isCorrect: false, pointsAwarded: 0, expired: true });
  });

  it("closes a late answer rather than leaving it open to retry", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await revealedAssignment(user.id, agesAgo());
    const correct = question.answers.find((a) => a.isCorrect)!;
    await answer(assignment.id, [correct.id]);

    const second = await answer(assignment.id, [correct.id]);

    expect(second.status).toBe(400);
    const row = await prisma.quizAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(row.pointsAwarded).toBe(0);
  });

  it("writes off a question the member revealed and walked away from", async () => {
    const user = await eligibleUser();
    const { assignment } = await revealedAssignment(user.id, agesAgo());

    const { pending } = await (await QUIZ_ME()).json();

    expect(pending).toHaveLength(0);
    const row = await prisma.quizAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(row.answeredAt).not.toBeNull();
    expect(row.isCorrect).toBe(false);
  });

  it("leaves a question still inside its window alone", async () => {
    const user = await eligibleUser();
    await revealedAssignment(user.id, new Date());

    const { pending, answerWindowSeconds } = await (await QUIZ_ME()).json();

    expect(pending).toHaveLength(1);
    expect(answerWindowSeconds).toBe(DEFAULT_ANSWER_WINDOW_SECONDS);
  });
});
