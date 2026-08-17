import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs } from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { GET: QUIZ_ME } = await import("@/app/api/quiz/me/route");
const { POST: REVEAL } = await import("@/app/api/quiz/assignments/[id]/reveal/route");
const { POST: ANSWER } = await import("@/app/api/quiz/answer/route");

async function eligibleUser() {
  const user = await createUser("22000010");
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

async function assignQuestion(userId: string) {
  const question = await prisma.quizQuestion.create({
    data: {
      text: "ما عاصمة موريتانيا؟",
      category: "جغرافيا",
      createdBy: "admin",
      answers: {
        create: [
          { text: "نواكشوط", isCorrect: true, order: 0 },
          { text: "نواذيبو", isCorrect: false, order: 1 },
        ],
      },
    },
    include: { answers: true },
  });
  const assignment = await prisma.quizAssignment.create({
    data: { userId, questionId: question.id, batchId: "b1", mode: "SAME" },
  });
  return { question, assignment };
}

function reveal(id: string) {
  return REVEAL(post(`/api/quiz/assignments/${id}/reveal`, {}), {
    params: Promise.resolve({ id }),
  });
}

describe("two-step quiz delivery", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("sends the statement without the options", async () => {
    const user = await eligibleUser();
    await assignQuestion(user.id);

    const { pending } = await (await QUIZ_ME()).json();

    expect(pending[0].question.text).toBe("ما عاصمة موريتانيا؟");
    expect(pending[0].question.answers).toEqual([]);
    expect(pending[0].revealedAt).toBeNull();
  });

  it("hands over the options on reveal and stamps the moment", async () => {
    const user = await eligibleUser();
    const { assignment } = await assignQuestion(user.id);

    const res = await reveal(assignment.id);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.answers).toHaveLength(2);
    expect(body.revealedAt).not.toBeNull();
  });

  it("keeps the first reveal time when asked twice", async () => {
    const user = await eligibleUser();
    const { assignment } = await assignQuestion(user.id);

    const first = await (await reveal(assignment.id)).json();
    const second = await (await reveal(assignment.id)).json();

    expect(second.revealedAt).toBe(first.revealedAt);
  });

  it("returns the options once revealed", async () => {
    const user = await eligibleUser();
    const { assignment } = await assignQuestion(user.id);
    await reveal(assignment.id);

    const { pending } = await (await QUIZ_ME()).json();

    expect(pending[0].question.answers).toHaveLength(2);
    expect(pending[0].revealedAt).not.toBeNull();
  });

  it("refuses an answer before the options were revealed", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await assignQuestion(user.id);
    const correct = question.answers.find((a) => a.isCorrect)!;

    const res = await ANSWER(
      post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [correct.id] }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.quizAssignment.count({ where: { answeredAt: { not: null } } })).toBe(0);
  });

  it("accepts the answer after a reveal", async () => {
    const user = await eligibleUser();
    const { question, assignment } = await assignQuestion(user.id);
    const correct = question.answers.find((a) => a.isCorrect)!;
    await reveal(assignment.id);

    const res = await ANSWER(
      post("/api/quiz/answer", { assignmentId: assignment.id, selectedAnswerIds: [correct.id] }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).isCorrect).toBe(true);
  });

  it("will not reveal another member's question", async () => {
    const owner = await createUser("22000011");
    const { assignment } = await assignQuestion(owner.id);
    await eligibleUser();

    expect((await reveal(assignment.id)).status).toBe(404);
  });
});
