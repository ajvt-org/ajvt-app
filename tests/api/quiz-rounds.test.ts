import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, post, createAdmin, signInAsAdmin, withId } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { NOT_A_ROUND, WRONG_POOL_SIZE } from "@/lib/quizPoolServer";
import { startOrResumeAttempt } from "@/lib/quizAttemptServer";

import {
  GET as ROUNDS,
  PUT as SET_POOL,
} from "@/app/api/admin/quiz/competitions/[id]/rounds/route";
import { POST as START } from "@/app/api/admin/quiz/competitions/[id]/start/route";

const START_AT = "2026-08-20T08:00:00.000Z";

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date(START_AT),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 3,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      ...over,
    },
  });
}

async function questions(n: number, category = "عام", points = 10) {
  const made = [];
  for (let i = 0; i < n; i++) {
    made.push(
      await prisma.quizQuestion.create({
        data: {
          text: `سؤال ${category} ${i}`,
          category,
          points,
          createdBy: "admin",
          answers: {
            create: [
              { text: "أ", isCorrect: true, order: 0 },
              { text: "ب", isCorrect: false, order: 1 },
            ],
          },
        },
      }),
    );
  }
  return made;
}

const rounds = (id: string) =>
  ROUNDS(put(`/api/admin/quiz/competitions/${id}/rounds`, {}), withId(id));
const setPool = (id: string, index: number, questionIds: string[]) =>
  SET_POOL(put(`/api/admin/quiz/competitions/${id}/rounds`, { index, questionIds }), withId(id));
const start = (id: string) =>
  START(post(`/api/admin/quiz/competitions/${id}/start`, {}), withId(id));

describe("loading the questions for a round", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("lists every round of the run with nothing loaded", async () => {
    const c = await competition();

    const body = await (await rounds(c.id)).json();

    expect(body.rounds.map((r: { index: number }) => r.index)).toEqual([0, 1, 2]);
    expect(body.rounds.every((r: { loaded: number }) => r.loaded === 0)).toBe(true);
    expect(body.plannable).toBe(0);
  });

  it("says how many rounds the bank can cover", async () => {
    const c = await competition();
    await questions(7);

    const body = await (await rounds(c.id)).json();

    expect(body.plannable).toBe(2);
    expect(body.bankSize).toBe(7);
  });

  it("stores the questions chosen for a round", async () => {
    const c = await competition();
    const qs = await questions(3);

    const res = await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );

    expect((await res.json()).loaded).toBe(3);
    const body = await (await rounds(c.id)).json();
    expect(body.rounds[0].loaded).toBe(3);
  });

  it("replaces the round's questions rather than adding to them", async () => {
    const c = await competition();
    const qs = await questions(6);
    await setPool(
      c.id,
      0,
      qs.slice(0, 3).map((q) => q.id),
    );

    await setPool(
      c.id,
      0,
      qs.slice(3).map((q) => q.id),
    );

    const round = await prisma.quizRound.findFirstOrThrow({ include: { questions: true } });
    expect(round.questions).toHaveLength(3);
    expect(round.questions.map((q) => q.questionId).sort()).toEqual(
      qs
        .slice(3)
        .map((q) => q.id)
        .sort(),
    );
  });

  it("keeps each competition's rounds apart", async () => {
    const one = await competition();
    const other = await competition({ name: "مسابقة أخرى" });
    const qs = await questions(3);

    await setPool(
      one.id,
      0,
      qs.map((q) => q.id),
    );

    expect((await (await rounds(one.id)).json()).rounds[0].loaded).toBe(3);
    expect((await (await rounds(other.id)).json()).rounds[0].loaded).toBe(0);
  });

  it("refuses a round outside the run", async () => {
    const c = await competition();
    const qs = await questions(3);

    const res = await setPool(
      c.id,
      9,
      qs.map((q) => q.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(NOT_A_ROUND);
  });

  it("refuses a set that is not exactly what a round serves", async () => {
    const c = await competition();
    const qs = await questions(4);

    const small = await setPool(
      c.id,
      0,
      qs.slice(0, 2).map((q) => q.id),
    );
    const big = await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );

    expect(small.status).toBe(400);
    expect((await small.json()).error).toBe(WRONG_POOL_SIZE);
    expect(big.status).toBe(400);
  });

  it("lets a round be emptied", async () => {
    const c = await competition();
    const qs = await questions(3);
    await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );

    const res = await setPool(c.id, 0, []);

    expect((await res.json()).loaded).toBe(0);
  });

  it("ignores a question that is switched off", async () => {
    const c = await competition();
    const qs = await questions(4);
    await prisma.quizQuestion.update({ where: { id: qs[0].id }, data: { active: false } });

    const res = await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );

    const body = await res.json();
    expect(body.loaded).toBe(3);
    expect(body.skipped).toBe(1);
  });

  it("refuses to change a round people have already played", async () => {
    const c = await competition({ startedAt: new Date("2026-08-20T00:00:00.000Z") });
    const qs = await questions(3);
    await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );
    const u = await prisma.user.create({ data: { phone: "22334455", password: "x" } });
    await startOrResumeAttempt(c.id, u.id, new Date("2026-08-20T10:00:00.000Z"));

    const res = await setPool(
      c.id,
      0,
      qs.map((q) => q.id),
    );

    expect(res.status).toBe(409);
  });
});

describe("drawing the rounds when the competition starts", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("spreads the bank across the run", async () => {
    const c = await competition();
    await questions(12);

    const res = await start(c.id);

    expect(res.status).toBe(200);
    const rows = await prisma.quizRound.findMany({ include: { questions: true } });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.questions.length === 3)).toBe(true);
    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).startedAt,
    ).not.toBeNull();
  });

  it("gives each round a different set", async () => {
    const c = await competition();
    await questions(12);
    await start(c.id);

    const rows = await prisma.quizRoundQuestion.findMany();
    expect(rows).toHaveLength(9);
    expect(new Set(rows.map((r) => r.questionId)).size).toBe(9);
  });

  it("lets the same question serve two competitions", async () => {
    const one = await competition();
    const other = await competition({ name: "مسابقة أخرى" });
    await questions(12);

    await start(one.id);
    await start(other.id);

    expect(await prisma.quizRoundQuestion.count()).toBe(18);
  });

  it("keeps each round to one category when that is the rule", async () => {
    const c = await competition({ categoryRounds: true });
    await questions(6, "حساب", 5);
    await questions(6, "حساب", 13);
    await questions(6, "دين", 5);
    await questions(6, "دين", 19);

    await start(c.id);

    const rows = await prisma.quizRound.findMany({
      include: { questions: { include: { question: true } } },
    });
    expect(rows).toHaveLength(3);
    for (const round of rows) {
      const seen = new Set(round.questions.map((q) => q.question.category));
      expect([...seen]).toEqual([round.category]);
    }
  });

  it("spreads a category round across its difficulties", async () => {
    const c = await competition({ categoryRounds: true, roundCount: 1 });
    await questions(4, "حساب", 5);
    await questions(4, "حساب", 13);
    await questions(4, "حساب", 19);

    await start(c.id);

    const round = await prisma.quizRound.findFirstOrThrow({
      include: { questions: { include: { question: true } } },
    });
    const points = new Set(round.questions.map((q) => q.question.points));
    expect(points.size).toBeGreaterThan(1);
  });

  it("never repeats a question across the rounds of one category run", async () => {
    const c = await competition({ categoryRounds: true });
    await questions(8, "حساب", 5);
    await questions(8, "دين", 13);

    await start(c.id);

    const rows = await prisma.quizRoundQuestion.findMany();
    expect(new Set(rows.map((r) => r.questionId)).size).toBe(rows.length);
  });

  it("draws only from the bank the quiz names", async () => {
    const bank = await prisma.questionBank.create({ data: { name: "بنك البدريين" } });
    const c = await competition({ bankId: bank.id });
    await questions(12, "عام");
    const mine = await questions(12, "خاص");
    await prisma.quizQuestion.updateMany({
      where: { id: { in: mine.map((q) => q.id) } },
      data: { bankId: bank.id },
    });

    await start(c.id);

    const rows = await prisma.quizRoundQuestion.findMany({ include: { question: true } });
    expect(rows).toHaveLength(9);
    expect(rows.every((r) => r.question.bankId === bank.id)).toBe(true);
  });

  it("refuses when the quiz's bank is too small even though another is not", async () => {
    const bank = await prisma.questionBank.create({ data: { name: "بنك فقير" } });
    const c = await competition({ bankId: bank.id });
    await questions(40, "عام");

    const res = await start(c.id);

    expect(res.status).toBe(400);
    expect(await prisma.quizRound.count()).toBe(0);
    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).startedAt,
    ).toBeNull();
  });

  it("refuses when no category is deep enough for a round", async () => {
    const c = await competition({ categoryRounds: true });
    await questions(2, "حساب");
    await questions(2, "دين");
    await questions(2, "تاريخ");
    await questions(2, "علوم");

    const res = await start(c.id);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("التصنيفات لا تكفي");
    expect(await prisma.quizRound.count()).toBe(0);
  });

  it("still mixes categories when the rule is off", async () => {
    const c = await competition();
    await questions(6, "حساب");
    await questions(6, "دين");

    await start(c.id);

    const rows = await prisma.quizRound.findMany();
    expect(rows.every((r) => r.category === null)).toBe(true);
  });

  it("refuses when the bank is too small for the whole run", async () => {
    const c = await competition();
    await questions(7);

    const res = await start(c.id);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("9");
    expect(await prisma.quizRound.count()).toBe(0);
  });

  it("refuses to start twice", async () => {
    const c = await competition({ startedAt: new Date() });
    await questions(12);

    expect((await start(c.id)).status).toBe(409);
  });
});

describe("who may load a round", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await competition();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await rounds(c.id)).status).toBe(403);
    expect((await setPool(c.id, 0, [])).status).toBe(403);
  });
});
