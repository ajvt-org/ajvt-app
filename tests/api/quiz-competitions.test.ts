import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  put,
  post,
  del,
  createUsers,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";
import { DEFAULT_CURVE } from "@/lib/competitionConfig";
import { STARTS_IN_PAST } from "@/lib/competitionServer";

import { GET as LIST, POST as CREATE } from "@/app/api/admin/quiz/competitions/route";
import {
  GET as READ,
  PUT as SAVE,
  DELETE as RESET,
} from "@/app/api/admin/quiz/competitions/[id]/route";
import { POST as START } from "@/app/api/admin/quiz/competitions/[id]/start/route";
import { POST as COPY } from "@/app/api/admin/quiz/competitions/[id]/copy/route";
import { POST as RESET_SCORES } from "@/app/api/admin/quiz/competitions/[id]/reset/route";
import {
  GET as READ_PARTS,
  PUT as SET_PARTS,
} from "@/app/api/admin/quiz/competitions/[id]/participants/route";

const SOON = new Date(Date.now() + 2 * 86_400_000).toISOString();
const config = { name: "مسابقة الصيف", startsAt: SOON };

const list = () => LIST();
const create = (body: unknown) => CREATE(post("/api/admin/quiz/competitions", body));
const read = (id: string) => READ(post(`/api/admin/quiz/competitions/${id}`, {}), withId(id));
const save = (id: string, body: unknown) =>
  SAVE(put(`/api/admin/quiz/competitions/${id}`, body), withId(id));
const copy = (id: string) => COPY(post(`/api/admin/quiz/competitions/${id}/copy`, {}), withId(id));
const start = (id: string) =>
  START(post(`/api/admin/quiz/competitions/${id}/start`, {}), withId(id));
const reset = (id: string) =>
  RESET_SCORES(post(`/api/admin/quiz/competitions/${id}/reset`, {}), withId(id));
const remove = (id: string) => RESET(del(`/api/admin/quiz/competitions/${id}`), withId(id));
const participants = (id: string) =>
  READ_PARTS(post(`/api/admin/quiz/competitions/${id}/participants`, {}), withId(id));
const setParticipants = (id: string, userIds: string[]) =>
  SET_PARTS(put(`/api/admin/quiz/competitions/${id}/participants`, { userIds }), withId(id));

async function made(body: unknown = config) {
  return (await (await create(body)).json()).competition as { id: string };
}

const small = { ...config, roundCount: 2, servedCount: 2 };

async function stocked(body: unknown = small) {
  const c = await made(body);
  await prisma.quizQuestion.createMany({
    data: Array.from({ length: 4 }, (_, i) => ({
      text: `سؤال ${i}`,
      category: "عام",
      createdBy: "admin",
    })),
  });
  return c;
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
    expect(body.defaults.fullSeconds).toBe(DEFAULT_CURVE.fullSeconds);
  });

  it("creates one from a name and a date, filling the rest with defaults", async () => {
    await create(config);

    const c = await prisma.competition.findFirstOrThrow();
    expect(c.name).toBe("مسابقة الصيف");
    expect(c.startsAt.toISOString()).toBe(SOON);
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

  it("refuses a start already in the past", async () => {
    const res = await create({
      ...config,
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(STARTS_IN_PAST);
  });

  it("refuses moving an existing start into the past", async () => {
    const c = await made();

    const res = await save(c.id, { startsAt: new Date(Date.now() - 3_600_000).toISOString() });

    expect(res.status).toBe(400);
    expect(await prisma.competition.count()).toBe(1);
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
      boards: [{ title: "كل خمس جولات", blockRounds: 5, counting: 4, wholeRun: false }],
    });

    const row = await prisma.competition.findUniqueOrThrow({
      where: { id: c.id },
      include: { boards: true },
    });
    expect(row.roundCount).toBe(20);
    expect(row.roundPeriodMinutes).toBe(60);
    expect(row.boards).toHaveLength(1);
    expect(row.boards[0].blockRounds).toBe(5);
  });

  it("gives a new competition the rankings it names", async () => {
    const c = await made({
      ...config,
      boards: [
        { title: "يومي", blockRounds: 1, counting: 1, wholeRun: false },
        { title: "عام", blockRounds: 7, counting: 6, wholeRun: true },
      ],
    });

    const boards = await prisma.quizBoard.findMany({
      where: { competitionId: c.id },
      orderBy: { order: "asc" },
    });
    expect(boards.map((b) => b.title)).toEqual(["يومي", "عام"]);
    expect(boards[1].wholeRun).toBe(true);
  });

  it("replaces the rankings rather than adding to them", async () => {
    const c = await made();

    await save(c.id, { boards: [{ title: "واحد", blockRounds: 1, counting: 1, wholeRun: false }] });

    const boards = await prisma.quizBoard.findMany({ where: { competitionId: c.id } });
    expect(boards.map((b) => b.title)).toEqual(["واحد"]);
  });

  it("refuses a ranking that counts more rounds than it covers", async () => {
    const c = await made();

    const res = await save(c.id, {
      boards: [{ title: "خطأ", blockRounds: 3, counting: 4, wholeRun: false }],
    });

    expect(res.status).toBe(400);
  });

  it("refuses a question time that does not outlast the full points window", async () => {
    const c = await made();

    const res = await save(c.id, { fullSeconds: 30, maxSeconds: 30 });

    expect(res.status).toBe(400);
  });

  it("refuses a floor outside 0 to 100", async () => {
    const c = await made();

    expect((await save(c.id, { floorPercent: 140 })).status).toBe(400);
    expect((await save(c.id, { floorPercent: -1 })).status).toBe(400);
  });

  it("keeps the curve it was given", async () => {
    const c = await made({ ...config, fullSeconds: 5, maxSeconds: 45, floorPercent: 20 });

    const row = await prisma.competition.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.fullSeconds).toBe(5);
    expect(row.maxSeconds).toBe(45);
    expect(row.floorPercent).toBe(20);
  });

  it("keeps a round to one category only when that was asked for", async () => {
    const off = await made();
    const on = await made({ ...config, name: "بالتصنيف", categoryRounds: true });

    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id: off.id } })).categoryRounds,
    ).toBe(false);
    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id: on.id } })).categoryRounds,
    ).toBe(true);
  });

  it("draws from the general bank when none is named", async () => {
    const c = await made();

    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).bankId).toBe(
      "general",
    );
  });

  it("keeps the bank it was given", async () => {
    const bank = await prisma.questionBank.create({ data: { name: "بنك البدريين" } });

    const c = await made({ ...config, bankId: bank.id });

    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).bankId).toBe(
      bank.id,
    );
  });

  it("refuses a bank that does not exist", async () => {
    expect((await create({ ...config, bankId: "nope" })).status).toBe(404);
  });

  it("freezes the bank once the competition has started", async () => {
    const bank = await prisma.questionBank.create({ data: { name: "بنك آخر" } });
    const c = await stocked();
    const before = (await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).bankId;
    await start(c.id);

    await save(c.id, { bankId: bank.id });

    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).bankId).toBe(
      before,
    );
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

describe("deleting a competition", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("removes one that has not started", async () => {
    const c = await made();

    const res = await remove(c.id);

    expect(res.status).toBe(200);
    expect(await prisma.competition.count()).toBe(0);
  });

  it("takes its rounds and their questions with it", async () => {
    const c = await made();
    const question = await prisma.quizQuestion.create({
      data: { text: "س", category: "ع", createdBy: "admin" },
    });
    const round = await prisma.quizRound.create({
      data: {
        competitionId: c.id,
        index: 0,
        opensAt: new Date("2026-08-20T08:00:00.000Z"),
        closesAt: new Date("2026-08-20T22:00:00.000Z"),
        questions: { create: [{ questionId: question.id }] },
      },
    });
    void round;

    await remove(c.id);

    expect(await prisma.quizRound.count()).toBe(0);
    expect(await prisma.quizRoundQuestion.count()).toBe(0);
    expect(await prisma.quizQuestion.count()).toBe(1);
  });

  it("drops its participants", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    const [user] = await createUsers(1);
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: user.id } });

    await remove(c.id);

    expect(await prisma.quizParticipant.count()).toBe(0);
  });

  it("leaves another competition alone", async () => {
    const gone = await made();
    const kept = await made({ ...config, name: "مسابقة الشتاء" });

    await remove(gone.id);

    expect((await prisma.competition.findMany()).map((c) => c.id)).toEqual([kept.id]);
  });

  it("removes one that has already started", async () => {
    const c = await stocked();
    await start(c.id);

    const res = await remove(c.id);

    expect(res.status).toBe(200);
    expect(await prisma.competition.count()).toBe(0);
  });

  it("takes the scores of a started competition with it", async () => {
    const c = await stocked();
    const [user] = await createUsers(1);
    await start(c.id);
    const round = await prisma.quizRound.findFirstOrThrow({
      where: { competitionId: c.id },
      include: { questions: true },
    });
    await prisma.quizAttempt.create({
      data: {
        roundId: round.id,
        userId: user.id,
        score: 30,
        answers: {
          create: [{ questionId: round.questions[0].questionId, position: 0, points: 30 }],
        },
      },
    });

    const body = await (await remove(c.id)).json();

    expect(body.attempts).toBe(1);
    expect(await prisma.quizAttempt.count()).toBe(0);
    expect(await prisma.quizAttemptAnswer.count()).toBe(0);
  });

  it("says what it removed along with the competition", async () => {
    const c = await made({ ...config, visibility: "PRIVATE" });
    const [user] = await createUsers(1);
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: user.id } });
    await prisma.quizRound.create({
      data: {
        competitionId: c.id,
        index: 0,
        opensAt: new Date("2026-08-20T08:00:00.000Z"),
        closesAt: new Date("2026-08-20T22:00:00.000Z"),
      },
    });

    const body = await (await remove(c.id)).json();

    expect(body).toMatchObject({ deleted: true, rounds: 1, attempts: 0, participants: 1 });
  });

  it("says nothing found for one that does not exist", async () => {
    expect((await remove("nope")).status).toBe(404);
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await made();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await remove(c.id)).status).toBe(403);
  });
});

describe("who may play a private competition", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  async function paidMember(fullName: string) {
    const [user] = await createUsers(1);
    await makeMember({
      userId: user.id,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
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
    const c = await stocked({ ...small, visibility: "PRIVATE" });
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
    id = (await stocked()).id;
    await start(id);
  });

  it("stamps when it started", async () => {
    expect(
      (await prisma.competition.findUniqueOrThrow({ where: { id } })).startedAt,
    ).not.toBeNull();
  });

  it("keeps the schedule and the scoring where they are", async () => {
    const res = await save(id, {
      servedCount: 3,
      roundCount: 40,
      startsAt: new Date(Date.now() + 9 * 86_400_000).toISOString(),
      maxSeconds: 90,
    });

    expect(res.status).toBe(200);
    const after = await prisma.competition.findUniqueOrThrow({ where: { id } });
    expect(after.servedCount).toBe(2);
    expect(after.roundCount).toBe(2);
    expect(after.maxSeconds).toBe(DEFAULT_CURVE.maxSeconds);
  });

  it("takes a new name", async () => {
    await save(id, { name: "المسابقة الكبرى" });

    expect((await prisma.competition.findUniqueOrThrow({ where: { id } })).name).toBe(
      "المسابقة الكبرى",
    );
  });

  it("takes a new title and period name on a standing, and keeps its id", async () => {
    const before = await prisma.quizBoard.findFirstOrThrow({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });

    await save(id, {
      boards: [{ id: before.id, title: "ترتيب اليوم", blockTitle: "اليوم" }],
    });

    const after = await prisma.quizBoard.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.title).toBe("ترتيب اليوم");
    expect(after.blockTitle).toBe("اليوم");
  });

  it("keeps a standing's block size and counting even when they are sent", async () => {
    const before = await prisma.quizBoard.findFirstOrThrow({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });

    await save(id, {
      boards: [{ id: before.id, title: before.title, blockRounds: 9, counting: 4, wholeRun: true }],
    });

    const after = await prisma.quizBoard.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.blockRounds).toBe(before.blockRounds);
    expect(after.counting).toBe(before.counting);
    expect(after.wholeRun).toBe(before.wholeRun);
  });

  it("adds a standing that ranks the rounds already played", async () => {
    const kept = await prisma.quizBoard.findFirstOrThrow({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });

    await save(id, {
      boards: [
        { id: kept.id, title: kept.title },
        { title: "أفضل جولتين", blockTitle: "المرحلة", blockRounds: 2, counting: 2 },
      ],
    });

    const boards = await prisma.quizBoard.findMany({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });
    expect(boards.map((b) => b.title)).toEqual([kept.title, "أفضل جولتين"]);
    expect(boards[1].blockRounds).toBe(2);
  });

  it("hands the new standing back with its id, so saving twice adds it once", async () => {
    const kept = await prisma.quizBoard.findFirstOrThrow({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });
    const body = {
      boards: [
        { id: kept.id, title: kept.title },
        { title: "أفضل جولتين", blockTitle: "المرحلة", blockRounds: 2, counting: 2 },
      ],
    };

    const first = await (await save(id, body)).json();
    const added = first.competition.boards.find(
      (b: { title: string }) => b.title === "أفضل جولتين",
    );
    expect(added.id).toBeTruthy();

    await save(id, {
      boards: [
        { id: kept.id, title: kept.title },
        { id: added.id, title: "أفضل جولتين", blockTitle: "المرحلة" },
      ],
    });

    expect(await prisma.quizBoard.count({ where: { competitionId: id } })).toBe(2);
  });

  it("removes a standing the admin dropped", async () => {
    const boards = await prisma.quizBoard.findMany({
      where: { competitionId: id },
      orderBy: { order: "asc" },
    });

    await save(id, { boards: [{ id: boards[0].id, title: boards[0].title }] });

    expect(await prisma.quizBoard.count({ where: { competitionId: id } })).toBe(1);
  });

  it("refuses to leave a competition with no standing at all", async () => {
    const res = await save(id, { boards: [] });

    expect(res.status).toBe(400);
    expect(await prisma.quizBoard.count({ where: { competitionId: id } })).toBeGreaterThan(0);
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

describe("copying a competition", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("clones the setup into a fresh run with a coming start", async () => {
    const c = await stocked({ ...small, visibility: "PRIVATE" });
    const [user] = await createUsers(1);
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: user.id } });
    await start(c.id);

    const res = await copy(c.id);
    const body = await res.json();

    expect(res.status).toBe(201);
    const clone = await prisma.competition.findUniqueOrThrow({
      where: { id: body.competition.id },
      include: { boards: true, participants: true, rounds: true },
    });
    expect(clone.name).toBe("نسخة من مسابقة الصيف");
    expect(clone.startedAt).toBeNull();
    expect(clone.startsAt.getTime()).toBeGreaterThan(Date.now());
    expect(clone.visibility).toBe("PRIVATE");
    expect(clone.roundCount).toBe(2);
    expect(clone.boards.length).toBeGreaterThan(0);
    expect(clone.participants).toHaveLength(1);
    expect(clone.rounds).toHaveLength(0);
  });

  it("leaves the source untouched and the copy editable", async () => {
    const c = await stocked();
    await start(c.id);

    const body = await (await copy(c.id)).json();
    const res = await save(body.competition.id, { name: "مسابقة الشتاء" });

    expect(res.status).toBe(200);
    expect((await prisma.competition.findUniqueOrThrow({ where: { id: c.id } })).name).toBe(
      "مسابقة الصيف",
    );
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await made();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await copy(c.id)).status).toBe(403);
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
