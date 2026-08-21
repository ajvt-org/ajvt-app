import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { quiz } from "@/lib/messages";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { resetDb, del, patch, createUser, createAdmin, signInAsAdmin, withId } from "./helpers";

import { DELETE as REMOVE, PATCH as EDIT } from "@/app/api/admin/quiz/questions/[id]/route";

const START = new Date("2026-08-01T08:00:00.000Z");

async function question(text = "سؤال") {
  return prisma.quizQuestion.create({
    data: {
      text,
      category: "عام",
      points: 10,
      correctCount: 1,
      createdBy: "admin",
      answers: {
        create: [
          { text: "صحيح", isCorrect: true, order: 0 },
          { text: "خطأ", isCorrect: false, order: 1 },
        ],
      },
    },
  });
}

async function round() {
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
  return prisma.quizRound.create({
    data: {
      competitionId: competition.id,
      index: 0,
      opensAt: START,
      closesAt: new Date(START.getTime() + 3_600_000),
    },
  });
}

const remove = (id: string) => REMOVE(del(`/api/admin/quiz/questions/${id}`), withId(id));

describe("a question a quiz has used", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("cannot be deleted once a round has drawn it", async () => {
    const q = await question();
    const r = await round();
    await prisma.quizRoundQuestion.create({ data: { roundId: r.id, questionId: q.id } });

    const res = await remove(q.id);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(quiz.questionInUse);
    expect(await prisma.quizQuestion.count({ where: { id: q.id } })).toBe(1);
  });

  it("cannot be deleted once a member has answered it", async () => {
    const q = await question();
    const r = await round();
    const user = await createUser("22334455");
    const attempt = await prisma.quizAttempt.create({ data: { roundId: r.id, userId: user.id } });
    await prisma.quizAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q.id, position: 0 },
    });

    expect((await remove(q.id)).status).toBe(409);
  });

  it("keeps the answers a member is going to read back", async () => {
    const q = await question();
    const r = await round();
    const user = await createUser("22334455");
    const attempt = await prisma.quizAttempt.create({ data: { roundId: r.id, userId: user.id } });
    await prisma.quizAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q.id, position: 0, points: 10, isCorrect: true },
    });

    await remove(q.id);

    expect(await prisma.quizAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(1);
  });

  it("can still be retired from the draws", async () => {
    const q = await question();
    const r = await round();
    await prisma.quizRoundQuestion.create({ data: { roundId: r.id, questionId: q.id } });

    const res = await EDIT(
      patch(`/api/admin/quiz/questions/${q.id}`, { active: false }),
      withId(q.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.quizQuestion.findUniqueOrThrow({ where: { id: q.id } })).active).toBe(
      false,
    );
  });

  it("is still deletable while no quiz has touched it", async () => {
    const q = await question();

    expect((await remove(q.id)).status).toBe(200);
    expect(await prisma.quizQuestion.count({ where: { id: q.id } })).toBe(0);
  });
});

describe("the database behind the guard", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("refuses a delete that goes around the route, for a drawn question", async () => {
    const q = await question();
    const r = await round();
    await prisma.quizRoundQuestion.create({ data: { roundId: r.id, questionId: q.id } });

    await expect(prisma.quizQuestion.delete({ where: { id: q.id } })).rejects.toMatchObject({
      code: "P2003",
    });
    expect(await prisma.quizQuestion.count({ where: { id: q.id } })).toBe(1);
  });

  it("refuses a delete that goes around the route, for an answered question", async () => {
    const q = await question();
    const r = await round();
    const user = await createUser("22334455");
    const attempt = await prisma.quizAttempt.create({ data: { roundId: r.id, userId: user.id } });
    await prisma.quizAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q.id, position: 0 },
    });

    await expect(prisma.quizQuestion.delete({ where: { id: q.id } })).rejects.toMatchObject({
      code: "P2003",
    });
  });

  it("still lets an untouched question and its answers go", async () => {
    const q = await question();

    await prisma.quizQuestion.delete({ where: { id: q.id } });

    expect(await prisma.quizAnswer.count({ where: { questionId: q.id } })).toBe(0);
  });
});

describe("a question drawn between the check and the delete", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("answers with the conflict rather than a server error", async () => {
    const q = await question();
    const r = await round();
    await prisma.quizRoundQuestion.create({ data: { roundId: r.id, questionId: q.id } });
    const blind = vi.spyOn(prisma.quizRoundQuestion, "count").mockResolvedValue(0);

    const res = await remove(q.id);
    blind.mockRestore();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(quiz.questionInUse);
    expect(await prisma.quizQuestion.count({ where: { id: q.id } })).toBe(1);
  });
});

describe("editing a question a quiz has used", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  async function used() {
    const q = await question();
    const r = await round();
    await prisma.quizRoundQuestion.create({ data: { roundId: r.id, questionId: q.id } });
    return q;
  }

  const edit = (id: string, body: Record<string, unknown>) =>
    EDIT(patch(`/api/admin/quiz/questions/${id}`, body), withId(id));

  it("lets a typo in the wording be fixed", async () => {
    const q = await used();

    const res = await edit(q.id, { text: "سؤال مصحح" });

    expect(res.status).toBe(200);
    expect((await prisma.quizQuestion.findUniqueOrThrow({ where: { id: q.id } })).text).toBe(
      "سؤال مصحح",
    );
  });

  it("lets the category be corrected", async () => {
    const q = await used();

    expect((await edit(q.id, { category: "تاريخ" })).status).toBe(200);
  });

  it("refuses a change to the answers", async () => {
    const q = await used();

    const res = await edit(q.id, {
      answers: [
        { text: "أ", isCorrect: true },
        { text: "ب", isCorrect: false },
      ],
    });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(quiz.questionAnswersLocked);
  });

  it("refuses a change to which answer is correct", async () => {
    const q = await used();

    expect((await edit(q.id, { correctCount: 2 })).status).toBe(409);
  });

  it("refuses a change to the points a score was computed from", async () => {
    const q = await used();

    expect((await edit(q.id, { points: 50 })).status).toBe(409);
    expect((await prisma.quizQuestion.findUniqueOrThrow({ where: { id: q.id } })).points).toBe(10);
  });

  it("refuses it once a member has answered, even with no round entry", async () => {
    const q = await question();
    const r = await round();
    const user = await createUser("22334455");
    const attempt = await prisma.quizAttempt.create({ data: { roundId: r.id, userId: user.id } });
    await prisma.quizAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q.id, position: 0 },
    });

    expect((await edit(q.id, { points: 50 })).status).toBe(409);
  });

  it("changes nothing at all when one field of the edit is refused", async () => {
    const q = await used();

    await edit(q.id, { text: "صياغة جديدة", points: 50 });

    const after = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: q.id } });
    expect(after.text).toBe("سؤال");
    expect(after.points).toBe(10);
  });

  it("leaves a question no quiz has touched fully editable", async () => {
    const q = await question();

    expect((await edit(q.id, { points: 50 })).status).toBe(200);
  });
});
