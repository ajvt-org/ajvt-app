import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { PATCH: SAVE_SETTINGS } = await import("@/app/api/admin/quiz/settings/route");
const { POST: ANSWER } = await import("@/app/api/quiz/answer/route");
const { GET: QUIZ_ME } = await import("@/app/api/quiz/me/route");

function save(body: unknown) {
  return SAVE_SETTINGS(patch("/api/admin/quiz/settings", body));
}

async function eligibleUser() {
  const user = await createUser("22000040");
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

describe("admin quiz timing and scoring", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("saves a window and a floor", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await save({ answerWindowSeconds: 30, minScorePercent: 25 });

    expect(res.status).toBe(200);
    expect((await res.json()).settings).toMatchObject({
      answerWindowSeconds: 30,
      minScorePercent: 25,
    });
  });

  it("accepts a floor of zero", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await save({ minScorePercent: 0 })).status).toBe(200);
  });

  it("refuses a window outside its bounds", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await save({ answerWindowSeconds: 1 })).status).toBe(400);
    expect((await save({ answerWindowSeconds: 3600 })).status).toBe(400);
  });

  it("refuses a floor above a hundred", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await save({ minScorePercent: 140 })).status).toBe(400);
  });

  it("lets a longer window keep an answer alive that the default would have killed", async () => {
    await signInAsAdmin(await createAdmin());
    await save({ answerWindowSeconds: 120 });

    const user = await eligibleUser();
    await signInAs(user);
    const { question, assignment } = await revealedSecondsAgo(user.id, 30);
    const correct = question.answers.find((a) => a.isCorrect)!;

    const body = await (
      await ANSWER(
        post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [correct.id] }),
      )
    ).json();

    expect(body.expired).toBe(false);
    expect(body.pointsAwarded).toBeGreaterThan(0);
  });

  it("hands the configured window to the member", async () => {
    await signInAsAdmin(await createAdmin());
    await save({ answerWindowSeconds: 45 });

    const user = await eligibleUser();
    await signInAs(user);

    expect((await (await QUIZ_ME()).json()).answerWindowSeconds).toBe(45);
  });

  it("pays the configured floor at the deadline", async () => {
    await signInAsAdmin(await createAdmin());
    await save({ answerWindowSeconds: 10, minScorePercent: 20 });

    const user = await eligibleUser();
    await signInAs(user);
    const { question, assignment } = await revealedSecondsAgo(user.id, 10);
    const correct = question.answers.find((a) => a.isCorrect)!;

    const body = await (
      await ANSWER(
        post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [correct.id] }),
      )
    ).json();

    expect(body.pointsAwarded).toBe(20);
  });
});
