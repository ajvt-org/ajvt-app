import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, post, del, createUsers, createAdmin, signInAsAdmin } from "./helpers";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";
import { ALREADY_STARTED } from "@/lib/competitionServer";

import { GET as LIST, POST as CREATE } from "@/app/api/admin/quiz/competitions/route";
import {
  GET as READ,
  PUT as SAVE,
  DELETE as RESET,
} from "@/app/api/admin/quiz/competitions/[id]/route";
import { POST as START } from "@/app/api/admin/quiz/competitions/[id]/start/route";
import {
  GET as READ_PARTS,
  PUT as SET_PARTS,
} from "@/app/api/admin/quiz/competitions/[id]/participants/route";

const config = { name: "مسابقة الصيف", startsAt: "2026-08-20T08:00:00.000Z" };
const at = (id: string) => ({ params: Promise.resolve({ id }) });

const list = () => LIST();
const create = (body: unknown) => CREATE(post("/api/admin/quiz/competitions", body));
const read = (id: string) => READ(post(`/api/admin/quiz/competitions/${id}`, {}), at(id));
const save = (id: string, body: unknown) =>
  SAVE(put(`/api/admin/quiz/competitions/${id}`, body), at(id));
const start = (id: string) => START(post(`/api/admin/quiz/competitions/${id}/start`, {}), at(id));
const reset = (id: string) => RESET(del(`/api/admin/quiz/competitions/${id}`), at(id));
const participants = (id: string) =>
  READ_PARTS(post(`/api/admin/quiz/competitions/${id}/participants`, {}), at(id));
const setParticipants = (id: string, userIds: string[]) =>
  SET_PARTS(put(`/api/admin/quiz/competitions/${id}/participants`, { userIds }), at(id));

async function made(body: unknown = config) {
  return (await (await create(body)).json()).competition as { id: string };
}

describe("configuring a competition before it starts", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("lists none to begin with, and offers the defaults", async () => {
    const body = await (await list()).json();

    expect(body.competitions).toEqual([]);
    expect(body.defaults.servedCount).toBe(10);
    expect(body.defaults.speedBands).toEqual(DEFAULT_BANDS);
  });

  it("creates one from a name and a date, filling the rest with defaults", async () => {
    await create(config);

    const c = await prisma.competition.findFirstOrThrow();
    expect(c.name).toBe("مسابقة الصيف");
    expect(c.startsAt.toISOString()).toBe("2026-08-20T08:00:00.000Z");
    expect(c.roundCount).toBe(30);
    expect(c.servedCount).toBe(10);
    expect(c.visibility).toBe("PUBLIC");
    expect(c.startedAt).toBeNull();
  });

  it("keeps several competitions side by side", async () => {
    await create(config);
    await create({ ...config, name: "مسابقة الشتاء" });

    const body = await (await list()).json();
    expect(body.competitions.map((c: { name: string }) => c.name).sort()).toEqual([
      "مسابقة الشتاء",
      "مسابقة الصيف",
    ]);
  });

  it("edits the one that was asked for and leaves the other alone", async () => {
    const first = await made();
    const second = await made({ ...config, name: "مسابقة الشتاء" });

    await save(first.id, { servedCount: 5, roundCount: 14 });

    const one = await prisma.competition.findUniqueOrThrow({ where: { id: first.id } });
    const other = await prisma.competition.findUniqueOrThrow({ where: { id: second.id } });
    expect(one.servedCount).toBe(5);
    expect(one.roundCount).toBe(14);
    expect(one.name).toBe("مسابقة الصيف");
    expect(other.servedCount).toBe(10);
  });

  it("reads back the one that was asked for", async () => {
    const c = await made();

    const body = await (await read(c.id)).json();

    expect(body.competition.name).toBe("مسابقة الصيف");
  });

  it("refuses a round longer than the gap between rounds", async () => {
    const c = await made();

    const res = await save(c.id, { roundPeriodMinutes: 60, roundWindowMinutes: 120 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("مدة الجولة");
  });

  it("takes an hourly run of twenty rounds", async () => {
    const c = await made({
      ...config,
      roundCount: 20,
      roundPeriodMinutes: 60,
      roundWindowMinutes: 60,
      groupSize: 5,
      countingRounds: 4,
    });

    const row = await prisma.competition.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.roundCount).toBe(20);
    expect(row.roundPeriodMinutes).toBe(60);
    expect(row.groupSize).toBe(5);
  });

  it("refuses a pool smaller than the round set", async () => {
    const c = await made();

    expect((await save(c.id, { servedCount: 20, poolSize: 10 })).status).toBe(400);
  });

  it("refuses speed bands that do not fall", async () => {
    const c = await made();

    const res = await save(c.id, {
      speedBands: [
        { maxSeconds: 10, percent: 50 },
        { maxSeconds: null, percent: 100 },
      ],
    });

    expect(res.status).toBe(400);
  });

  it("keeps custom bands once they are valid", async () => {
    const c = await made({
      ...config,
      speedBands: [
        { maxSeconds: 5, percent: 100 },
        { maxSeconds: null, percent: 40 },
      ],
    });

    const row = await prisma.competition.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.speedBands).toEqual([
      { maxSeconds: 5, percent: 100 },
      { maxSeconds: null, percent: 40 },
    ]);
  });

  it("refuses a visibility that is neither public nor private", async () => {
    expect((await create({ ...config, visibility: "SECRET" })).status).toBe(400);
  });
});

describe("clearing what has been scored", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  async function played(competitionId: string, score: number) {
    const [user] = await createUsers(1);
    const round = await prisma.quizRound.create({
      data: {
        competitionId,
        index: 0,
        opensAt: new Date("2026-08-20T08:00:00.000Z"),
        closesAt: new Date("2026-08-20T22:00:00.000Z"),
      },
    });
    const question = await prisma.quizQuestion.create({
      data: { text: "س", category: "ع", createdBy: "admin" },
    });
    return prisma.quizAttempt.create({
      data: {
        roundId: round.id,
        userId: user.id,
        score,
        answers: { create: [{ questionId: question.id, position: 0, points: score }] },
      },
    });
  }

  it("clears the scores of the competition it was asked about", async () => {
    const c = await made();
    const attempt = await played(c.id, 30);

    const res = await reset(c.id);

    expect((await res.json()).cleared).toBe(1);
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).score).toBe(
      0,
    );
    expect((await prisma.quizAttemptAnswer.findFirstOrThrow()).points).toBe(0);
  });

  it("leaves another competition's scores alone", async () => {
    const mine = await made();
    const other = await made({ ...config, name: "مسابقة الشتاء" });
    const kept = await played(other.id, 30);

    await reset(mine.id);

    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id: kept.id } })).score).toBe(30);
  });
});

describe("who may play a private competition", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  async function paidMember(fullName: string) {
    const [user] = await createUsers(1);
    await prisma.member.create({
      data: {
        userId: user.id,
        fullName,
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
        paidAmount: 100,
      },
    });
    return user;
  }

  it("offers every paid member as a candidate", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    await paidMember("أحمد");

    const body = await (await participants(c.id)).json();

    expect(body.userIds).toEqual([]);
    expect(body.candidates.map((m: { fullName: string }) => m.fullName)).toEqual(["أحمد"]);
  });

  it("stores the list that was chosen", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    const one = await paidMember("أحمد");
    const two = await paidMember("محمد");

    const res = await setParticipants(c.id, [one.id, two.id]);

    expect((await res.json()).saved).toBe(2);
    const body = await (await participants(c.id)).json();
    expect(body.userIds.sort()).toEqual([one.id, two.id].sort());
  });

  it("replaces the list rather than adding to it", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    const one = await paidMember("أحمد");
    const two = await paidMember("محمد");
    await setParticipants(c.id, [one.id, two.id]);

    await setParticipants(c.id, [two.id]);

    const body = await (await participants(c.id)).json();
    expect(body.userIds).toEqual([two.id]);
  });

  it("ignores a user who does not exist", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });

    const res = await setParticipants(c.id, ["nobody"]);

    expect((await res.json()).saved).toBe(0);
  });

  it("freezes the list once the competition has started", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    const one = await paidMember("أحمد");
    await start(c.id);

    expect((await setParticipants(c.id, [one.id])).status).toBe(409);
  });
});

describe("once a competition has started", () => {
  let id = "";

  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
    id = (await made()).id;
    await start(id);
  });

  it("stamps when it started", async () => {
    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id } })).startedAt,
    ).not.toBeNull();
  });

  it("freezes every setting", async () => {
    const res = await save(id, { servedCount: 3 });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(ALREADY_STARTED);
    expect((await prisma.competition.findUniqueOrThrow({ where: { id } })).servedCount).toBe(10);
  });

  it("refuses to start twice", async () => {
    expect((await start(id)).status).toBe(409);
  });

  it("refuses to clear the scores", async () => {
    expect((await reset(id)).status).toBe(409);
  });

  it("lets a second competition still be configured", async () => {
    const other = await made({ ...config, name: "مسابقة الشتاء" });

    expect((await save(other.id, { servedCount: 3 })).status).toBe(200);
  });
});

describe("who may configure a competition", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await list()).status).toBe(403);
    expect((await create(config)).status).toBe(403);
    expect((await save("c1", config)).status).toBe(403);
    expect((await start("c1")).status).toBe(403);
  });

  it("cannot start one that does not exist", async () => {
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));

    expect((await start("nope")).status).toBe(404);
  });
});
