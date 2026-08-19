import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, post, createAdmin, signInAsAdmin } from "./helpers";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";
import { NOT_A_ROUND, POOL_TOO_SMALL } from "@/lib/quizPoolServer";
import { startOrResumeAttempt } from "@/lib/quizAttemptServer";

import { GET as ROUNDS, PUT as SET_POOL } from "@/app/api/admin/quiz/rounds/route";
import { POST as FILL } from "@/app/api/admin/quiz/rounds/fill/route";

const START = "2026-08-20T08:00:00.000Z";

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date(START),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 3,
      poolSize: 4,
      groupSize: 7,
      countingRounds: 6,
      speedBands: DEFAULT_BANDS as unknown as object,
      ...over,
    },
  });
}

async function questions(n: number) {
  const made = [];
  for (let i = 0; i < n; i++) {
    made.push(
      await prisma.quizQuestion.create({
        data: {
          text: `سؤال ${i}`,
          category: "عام",
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

const setPool = (index: number, questionIds: string[]) =>
  SET_POOL(put("/api/admin/quiz/rounds", { index, questionIds }));

describe("loading the questions for a round", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("lists every round of the run with nothing loaded", async () => {
    await competition();

    const body = await (await ROUNDS()).json();

    expect(body.rounds.map((r: { index: number }) => r.index)).toEqual([0, 1, 2]);
    expect(body.rounds.every((r: { loaded: number }) => r.loaded === 0)).toBe(true);
  });

  it("stores the questions chosen for a round", async () => {
    await competition();
    const qs = await questions(4);

    const res = await setPool(
      0,
      qs.map((q) => q.id),
    );

    expect((await res.json()).loaded).toBe(4);
    const body = await (await ROUNDS()).json();
    expect(body.rounds[0].loaded).toBe(4);
  });

  it("replaces the round's questions rather than adding to them", async () => {
    await competition();
    const qs = await questions(8);
    await setPool(
      0,
      qs.slice(0, 4).map((q) => q.id),
    );

    await setPool(
      0,
      qs.slice(4).map((q) => q.id),
    );

    const day = await prisma.quizRound.findFirstOrThrow({ include: { questions: true } });
    expect(day.questions).toHaveLength(4);
    expect(day.questions.map((q) => q.questionId).sort()).toEqual(
      qs
        .slice(4)
        .map((q) => q.id)
        .sort(),
    );
  });

  it("refuses a round outside the run", async () => {
    await competition();
    const qs = await questions(4);

    const res = await setPool(
      9,
      qs.map((q) => q.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(NOT_A_ROUND);
  });

  it("refuses a pool smaller than what each member is served", async () => {
    await competition();
    const qs = await questions(2);

    const res = await setPool(
      0,
      qs.map((q) => q.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(POOL_TOO_SMALL);
  });

  it("lets a round be emptied", async () => {
    await competition();
    const qs = await questions(4);
    await setPool(
      0,
      qs.map((q) => q.id),
    );

    const res = await setPool(0, []);

    expect((await res.json()).loaded).toBe(0);
  });

  it("ignores a question that is switched off", async () => {
    await competition();
    const qs = await questions(5);
    await prisma.quizQuestion.update({ where: { id: qs[0].id }, data: { active: false } });

    const res = await setPool(
      0,
      qs.map((q) => q.id),
    );

    const body = await res.json();
    expect(body.loaded).toBe(4);
    expect(body.skipped).toBe(1);
  });

  it("refuses to change a round people have already played", async () => {
    const c = await competition({ startedAt: new Date("2026-08-20T00:00:00.000Z") });
    const qs = await questions(4);
    await setPool(
      0,
      qs.map((q) => q.id),
    );
    const u = await prisma.user.create({ data: { phone: "22334455", password: "x" } });
    await startOrResumeAttempt(u.id, new Date("2026-08-20T10:00:00.000Z"));
    void c;

    const res = await setPool(
      0,
      qs.slice(0, 3).map((q) => q.id),
    );

    expect(res.status).toBe(409);
  });
});

describe("filling every round from the bank at once", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("spreads the bank across the run", async () => {
    await competition();
    await questions(12);

    const res = await FILL(post("/api/admin/quiz/rounds/fill", {}));

    expect((await res.json()).filled).toBe(3);
    const days = await prisma.quizRound.findMany({ include: { questions: true } });
    expect(days).toHaveLength(3);
    expect(days.every((d) => d.questions.length === 4)).toBe(true);
  });

  it("gives each round a different set", async () => {
    await competition();
    await questions(12);
    await FILL(post("/api/admin/quiz/rounds/fill", {}));

    const rows = await prisma.quizRoundQuestion.findMany();
    expect(new Set(rows.map((r) => r.questionId)).size).toBe(12);
  });

  it("refuses when the bank is too small for the whole run", async () => {
    await competition();
    await questions(7);

    const res = await FILL(post("/api/admin/quiz/rounds/fill", {}));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("12");
    expect(await prisma.quizRound.count()).toBe(0);
  });

  it("refuses once the competition has started", async () => {
    await competition({ startedAt: new Date() });
    await questions(12);

    expect((await FILL(post("/api/admin/quiz/rounds/fill", {}))).status).toBe(409);
  });
});

describe("who may load a round", () => {
  beforeEach(async () => {
    await resetDb();
    await competition();
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await ROUNDS()).status).toBe(403);
    expect((await setPool(0, [])).status).toBe(403);
  });
});
