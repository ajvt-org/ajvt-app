import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUsers, createAdmin, signInAs, signInAsAdmin, withId } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { GET as MY_ROUNDS } from "@/app/api/quiz/breakdown/route";
import { GET as MY_DETAIL } from "@/app/api/quiz/breakdown/[id]/route";
import { GET as ADMIN_DETAIL } from "@/app/api/admin/quiz/attempts/[id]/route";
import { GET as ADMIN_ROUND } from "@/app/api/admin/quiz/competitions/[id]/attempts/route";

const DAY = 86_400_000;

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date(Date.now() - 4 * DAY),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
      ...over,
    },
  });
}

async function member(userId: string, fullName: string) {
  return prisma.member.create({
    data: {
      userId,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
}

async function question(text: string, points: number, category = "جغرافيا") {
  return prisma.quizQuestion.create({
    data: {
      text,
      category,
      points,
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

async function attempt(competitionId: string, userId: string, index = 0) {
  const round = await prisma.quizRound.create({
    data: {
      competitionId,
      index,
      category: "جغرافيا",
      opensAt: new Date("2026-08-20T08:00:00.000Z"),
      closesAt: new Date("2026-08-20T22:00:00.000Z"),
    },
  });
  const right = await question("سؤال صحيح", 10);
  const wrong = await question("سؤال خاطئ", 20);
  const skipped = await question("سؤال متروك", 15);

  return prisma.quizAttempt.create({
    data: {
      roundId: round.id,
      userId,
      score: 10,
      finishedAt: new Date("2026-08-20T09:00:00.000Z"),
      answers: {
        create: [
          {
            questionId: right.id,
            position: 0,
            isCorrect: true,
            elapsedMs: 5_000,
            points: 10,
          },
          {
            questionId: wrong.id,
            position: 1,
            isCorrect: false,
            elapsedMs: 40_000,
            points: 0,
          },
          { questionId: skipped.id, position: 2 },
        ],
      },
    },
  });
}

async function paidUser(name = "أحمد") {
  const [user] = await createUsers(1);
  await member(user.id, name);
  return user;
}

describe("a member reading their own score", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists the rounds they played in a competition", async () => {
    const c = await competition();
    const user = await paidUser();
    await attempt(c.id, user.id);
    await signInAs(user);

    const body = await (await MY_ROUNDS(get(`/api/quiz/breakdown?competition=${c.id}`))).json();

    expect(body.rounds.filter((r: { missed: boolean }) => !r.missed)).toHaveLength(1);
    expect(body.rounds[0].round).toBe(0);
    expect(body.rounds[0].score).toBe(10);
    expect(body.rounds[0].category).toBe("جغرافيا");
  });

  it("keeps a missed round on the list with nothing scored", async () => {
    const c = await competition();
    const user = await paidUser();
    await attempt(c.id, user.id, 2);
    await signInAs(user);

    const body = await (await MY_ROUNDS(get(`/api/quiz/breakdown?competition=${c.id}`))).json();

    expect(body.rounds.map((r: { round: number }) => r.round)).toEqual([0, 1, 2]);
    expect(body.rounds[0].missed).toBe(true);
    expect(body.rounds[0].attemptId).toBeNull();
    expect(body.rounds[0].score).toBe(0);
    expect(body.rounds[2].missed).toBe(false);
  });

  it("does not call a round missed while it is still open", async () => {
    const c = await competition({ startsAt: new Date(Date.now() - 60 * 60 * 1000) });
    const user = await paidUser();
    await signInAs(user);

    const body = await (await MY_ROUNDS(get(`/api/quiz/breakdown?competition=${c.id}`))).json();

    expect(body.rounds).toEqual([]);
  });

  it("breaks an attempt down question by question", async () => {
    const c = await competition();
    const user = await paidUser();
    const made = await attempt(c.id, user.id);
    await signInAs(user);

    const body = await (
      await MY_DETAIL(get(`/api/quiz/breakdown/${made.id}`), withId(made.id))
    ).json();

    expect(body.detail.breakdown.rows).toHaveLength(3);
    expect(body.detail.breakdown.correct).toBe(1);
    expect(body.detail.breakdown.answered).toBe(2);
    expect(body.detail.breakdown.total).toBe(3);
    expect(body.detail.breakdown.score).toBe(10);
    expect(body.detail.breakdown.possible).toBe(45);
  });

  it("says how much of each round was right", async () => {
    const c = await competition();
    const user = await paidUser();
    await attempt(c.id, user.id);
    await signInAs(user);

    const body = await (await MY_ROUNDS(get(`/api/quiz/breakdown?competition=${c.id}`))).json();

    expect(body.rounds[0].correct).toBe(1);
    expect(body.rounds[0].total).toBe(3);
  });

  it("keeps the right answers, the choices and the times to itself", async () => {
    const c = await competition();
    const user = await paidUser();
    const made = await attempt(c.id, user.id);
    await signInAs(user);

    const body = await (
      await MY_DETAIL(get(`/api/quiz/breakdown/${made.id}`), withId(made.id))
    ).json();

    expect(body.detail.breakdown.rows[0].correct).toBeUndefined();
    expect(body.detail.breakdown.rows[0].chosen).toBeUndefined();
    expect(body.detail.breakdown.rows[0].elapsedMs).toBeUndefined();
    expect(body.detail.breakdown.rows[0].percent).toBeUndefined();
    expect(body.detail.curve).toBeUndefined();
    expect(body.detail.userId).toBeUndefined();
  });

  it("still says what each question paid and where it landed", async () => {
    const c = await competition();
    const user = await paidUser();
    const made = await attempt(c.id, user.id);
    await signInAs(user);

    const body = await (
      await MY_DETAIL(get(`/api/quiz/breakdown/${made.id}`), withId(made.id))
    ).json();

    expect(body.detail.round).toBe(0);
    expect(body.detail.competitionName).toBe("مسابقة");
    expect(body.detail.breakdown.rows[0].points).toBe(10);
    expect(body.detail.breakdown.rows[0].isCorrect).toBe(true);
  });

  it("refuses to show another member's attempt", async () => {
    const c = await competition();
    const mine = await paidUser("أحمد");
    const theirs = await paidUser("محمد");
    const made = await attempt(c.id, theirs.id);
    await signInAs(mine);

    const res = await MY_DETAIL(get(`/api/quiz/breakdown/${made.id}`), withId(made.id));

    expect(res.status).toBe(403);
  });

  it("says nothing found for an attempt that does not exist", async () => {
    const user = await paidUser();
    await signInAs(user);

    expect((await MY_DETAIL(get("/api/quiz/breakdown/nope"), withId("nope"))).status).toBe(404);
  });

  it("is closed to a member who has not paid", async () => {
    const c = await competition();
    const [user] = await createUsers(1);
    await signInAs(user);

    expect((await MY_ROUNDS(get(`/api/quiz/breakdown?competition=${c.id}`))).status).toBe(403);
  });
});

describe("an admin reading anyone's score", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("lists who played a round and what they scored", async () => {
    const c = await competition();
    const user = await paidUser();
    await attempt(c.id, user.id);

    const body = await (
      await ADMIN_ROUND(get(`/api/admin/quiz/competitions/${c.id}/attempts?round=0`), withId(c.id))
    ).json();

    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].name).toBe("أحمد");
    expect(body.attempts[0].score).toBe(10);
  });

  it("is empty for a round nobody has played", async () => {
    const c = await competition();

    const body = await (
      await ADMIN_ROUND(get(`/api/admin/quiz/competitions/${c.id}/attempts?round=2`), withId(c.id))
    ).json();

    expect(body.attempts).toEqual([]);
  });

  it("says whether the round's window has opened", async () => {
    const running = await competition({ startsAt: new Date(Date.now() - 3_600_000) });
    const ahead = await competition({
      name: "مسابقة قادمة",
      startsAt: new Date(Date.now() + 86_400_000),
    });

    const now = await (
      await ADMIN_ROUND(
        get(`/api/admin/quiz/competitions/${running.id}/attempts?round=0`),
        withId(running.id),
      )
    ).json();
    const later = await (
      await ADMIN_ROUND(
        get(`/api/admin/quiz/competitions/${ahead.id}/attempts?round=0`),
        withId(ahead.id),
      )
    ).json();

    expect(now.opened).toBe(true);
    expect(later.opened).toBe(false);
  });

  it("opens any member's breakdown", async () => {
    const c = await competition();
    const user = await paidUser();
    const made = await attempt(c.id, user.id);

    const body = await (
      await ADMIN_DETAIL(get(`/api/admin/quiz/attempts/${made.id}`), withId(made.id))
    ).json();

    expect(body.detail.name).toBe("أحمد");
    expect(body.detail.breakdown.rows).toHaveLength(3);
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await competition();
    const user = await paidUser();
    const made = await attempt(c.id, user.id);
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect(
      (await ADMIN_DETAIL(get(`/api/admin/quiz/attempts/${made.id}`), withId(made.id))).status,
    ).toBe(403);
    expect(
      (
        await ADMIN_ROUND(
          get(`/api/admin/quiz/competitions/${c.id}/attempts?round=0`),
          withId(c.id),
        )
      ).status,
    ).toBe(403);
  });
});
