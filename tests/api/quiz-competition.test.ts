import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, post, del, createAdmin, signInAsAdmin } from "./helpers";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";
import { ALREADY_STARTED } from "@/lib/competitionServer";

import { GET as READ, PUT as SAVE, DELETE as RESET } from "@/app/api/admin/quiz/competition/route";
import { POST as START } from "@/app/api/admin/quiz/competition/start/route";

const config = { name: "مسابقة الصيف", startsAt: "2026-08-20T08:00:00.000Z" };

const save = (body: unknown) => SAVE(put("/api/admin/quiz/competition", body));
const read = () => READ();
const start = () => START(post("/api/admin/quiz/competition/start", {}));

describe("configuring a competition before it starts", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("says there is none to begin with, and offers the defaults", async () => {
    const body = await (await read()).json();

    expect(body.competition).toBeNull();
    expect(body.defaults.servedCount).toBe(10);
    expect(body.defaults.speedBands).toEqual(DEFAULT_BANDS);
  });

  it("creates one from a name and a date, filling the rest with defaults", async () => {
    await save(config);

    const c = await prisma.competition.findFirstOrThrow();
    expect(c.name).toBe("مسابقة الصيف");
    expect(c.startsAt.toISOString()).toBe("2026-08-20T08:00:00.000Z");
    expect(c.roundCount).toBe(30);
    expect(c.servedCount).toBe(10);
    expect(c.startedAt).toBeNull();
  });

  it("edits the one that exists rather than making a second", async () => {
    await save(config);

    await save({ servedCount: 5, roundCount: 14 });

    const all = await prisma.competition.findMany();
    expect(all).toHaveLength(1);
    expect(all[0].servedCount).toBe(5);
    expect(all[0].roundCount).toBe(14);
    expect(all[0].name).toBe("مسابقة الصيف");
  });

  it("refuses a round longer than the gap between rounds", async () => {
    await save(config);

    const res = await save({ roundPeriodMinutes: 60, roundWindowMinutes: 120 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("مدة الجولة");
  });

  it("takes an hourly run of twenty rounds", async () => {
    await save({
      ...config,
      roundCount: 20,
      roundPeriodMinutes: 60,
      roundWindowMinutes: 60,
      groupSize: 5,
      countingRounds: 4,
    });

    const c = await prisma.competition.findFirstOrThrow();
    expect(c.roundCount).toBe(20);
    expect(c.roundPeriodMinutes).toBe(60);
    expect(c.groupSize).toBe(5);
  });

  it("refuses a pool smaller than the daily set", async () => {
    await save(config);

    expect((await save({ servedCount: 20, poolSize: 10 })).status).toBe(400);
  });

  it("refuses speed bands that do not fall", async () => {
    await save(config);

    const res = await save({
      speedBands: [
        { maxSeconds: 10, percent: 50 },
        { maxSeconds: null, percent: 100 },
      ],
    });

    expect(res.status).toBe(400);
  });

  it("keeps custom bands once they are valid", async () => {
    await save({
      ...config,
      speedBands: [
        { maxSeconds: 5, percent: 100 },
        { maxSeconds: null, percent: 40 },
      ],
    });

    const c = await prisma.competition.findFirstOrThrow();
    expect(c.speedBands).toEqual([
      { maxSeconds: 5, percent: 100 },
      { maxSeconds: null, percent: 40 },
    ]);
  });

  it("clears the scores while nothing has started", async () => {
    const user = await prisma.user.create({ data: { phone: "22334455", password: "x" } });
    const q = await prisma.quizQuestion.create({
      data: { text: "س", category: "ع", createdBy: "admin" },
    });
    await prisma.quizAssignment.create({
      data: { userId: user.id, questionId: q.id, batchId: "b", mode: "SAME", pointsAwarded: 30 },
    });

    const res = await RESET(del("/api/admin/quiz/competition"));

    expect((await res.json()).cleared).toBe(1);
    expect((await prisma.quizAssignment.findFirstOrThrow()).pointsAwarded).toBe(0);
  });
});

describe("once a competition has started", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
    await save(config);
    await start();
  });

  it("stamps when it started", async () => {
    expect((await prisma.competition.findFirstOrThrow()).startedAt).not.toBeNull();
  });

  it("freezes every setting", async () => {
    const res = await save({ servedCount: 3 });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(ALREADY_STARTED);
    expect((await prisma.competition.findFirstOrThrow()).servedCount).toBe(10);
  });

  it("refuses to start twice", async () => {
    expect((await start()).status).toBe(409);
  });

  it("refuses to clear the scores", async () => {
    const res = await RESET(del("/api/admin/quiz/competition"));

    expect(res.status).toBe(409);
  });
});

describe("who may configure a competition", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await read()).status).toBe(403);
    expect((await save(config)).status).toBe(403);
    expect((await start()).status).toBe(403);
  });

  it("cannot be started before one is configured", async () => {
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));

    expect((await start()).status).toBe(404);
  });
});
