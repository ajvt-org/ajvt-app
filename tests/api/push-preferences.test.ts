import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers, createUser, get, put, signInAs } from "./helpers";

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
process.env.VAPID_PRIVATE_KEY = "test-private-key";

const sent = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (subscription: { endpoint: string }) => {
      sent.calls.push(subscription.endpoint);
    }),
  },
}));

const { sendPushToUsers, sendPushToUser } = await import("@/lib/push");
const { GET: READ_PREFS, PUT: SET_PREF } =
  await import("@/app/api/user/notification-preferences/route");

const PAYLOAD = { title: "عنوان", body: "نص" };

async function subscriber(phone: string) {
  const user = await createUser(phone);
  await prisma.pushSubscription.create({
    data: {
      userId: user.id,
      endpoint: `https://push.example/${user.id}`,
      p256dh: "key",
      auth: "auth",
    },
  });
  return user;
}

const endpointOf = (user: { id: string }) => `https://push.example/${user.id}`;

async function optOut(userId: string, category: string) {
  await prisma.notificationPreference.create({ data: { userId, category, enabled: false } });
}

describe("a category a member has switched off", () => {
  beforeEach(async () => {
    await resetDb();
    sent.calls = [];
  });

  it("reaches a member who has chosen nothing, exactly as before", async () => {
    const user = await subscriber("22000001");

    await sendPushToUsers([user.id], PAYLOAD, "QUIZ_ROUND");

    expect(sent.calls).toEqual([endpointOf(user)]);
  });

  it("stops arriving once it is switched off", async () => {
    const user = await subscriber("22000001");
    await optOut(user.id, "QUIZ_ROUND");

    await sendPushToUsers([user.id], PAYLOAD, "QUIZ_ROUND");

    expect(sent.calls).toEqual([]);
  });

  it("silences only the category chosen, not the others", async () => {
    const user = await subscriber("22000001");
    await optOut(user.id, "QUIZ_ROUND");

    await sendPushToUsers([user.id], PAYLOAD, "TOURNAMENT_MATCH");

    expect(sent.calls).toEqual([endpointOf(user)]);
  });

  it("still delivers what cannot be switched off", async () => {
    const user = await subscriber("22000001");
    for (const category of ["QUIZ_ROUND", "TOURNAMENT_MATCH", "MATCH_REMINDER", "BROADCAST"]) {
      await optOut(user.id, category);
    }

    await sendPushToUser(user.id, PAYLOAD, "MEMBERSHIP_DECISION");

    expect(sent.calls).toEqual([endpointOf(user)]);
  });

  it("leaves another member's choice alone", async () => {
    const quiet = await subscriber("22000001");
    const listening = await subscriber("22000002");
    await optOut(quiet.id, "QUIZ_ROUND");

    await sendPushToUsers([quiet.id, listening.id], PAYLOAD, "QUIZ_ROUND");

    expect(sent.calls).toEqual([endpointOf(listening)]);
  });

  it("comes back when the member switches it on again", async () => {
    const user = await subscriber("22000001");
    await optOut(user.id, "QUIZ_ROUND");
    await prisma.notificationPreference.update({
      where: { userId_category: { userId: user.id, category: "QUIZ_ROUND" } },
      data: { enabled: true },
    });

    await sendPushToUsers([user.id], PAYLOAD, "QUIZ_ROUND");

    expect(sent.calls).toEqual([endpointOf(user)]);
  });

  it("is read in the same single query however many are targeted", async () => {
    const users = await createUsers(40);
    await prisma.pushSubscription.createMany({
      data: users.map((u) => ({
        userId: u.id,
        endpoint: `https://push.example/${u.id}`,
        p256dh: "key",
        auth: "auth",
      })),
    });
    await optOut(users[0].id, "QUIZ_ROUND");
    const findMany = vi.spyOn(prisma.pushSubscription, "findMany");

    await sendPushToUsers(
      users.map((u) => u.id),
      PAYLOAD,
      "QUIZ_ROUND",
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(sent.calls).toHaveLength(39);
    findMany.mockRestore();
  });
});

describe("the preferences a member reads and sets", () => {
  beforeEach(async () => {
    await resetDb();
    sent.calls = [];
  });

  it("reads every category as on before anything is chosen", async () => {
    const user = await createUser("22000001");
    await signInAs(user);

    const body = await (await READ_PREFS(get("/api/user/notification-preferences"))).json();

    expect(body.categories.every((c: { enabled: boolean }) => c.enabled)).toBe(true);
    expect(body.categories.filter((c: { optOut: boolean }) => c.optOut)).toHaveLength(4);
  });

  it("records a category being switched off", async () => {
    const user = await createUser("22000001");
    await signInAs(user);

    const res = await SET_PREF(
      put("/api/user/notification-preferences", { category: "QUIZ_ROUND", enabled: false }),
    );

    expect(res.status).toBe(200);
    const row = await prisma.notificationPreference.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(row).toMatchObject({ category: "QUIZ_ROUND", enabled: false });
  });

  it("writes one row however many times it is toggled", async () => {
    const user = await createUser("22000001");
    await signInAs(user);

    for (const enabled of [false, true, false]) {
      await SET_PREF(
        put("/api/user/notification-preferences", { category: "QUIZ_ROUND", enabled }),
      );
    }

    expect(await prisma.notificationPreference.count({ where: { userId: user.id } })).toBe(1);
  });

  it("refuses a category that cannot be switched off", async () => {
    const user = await createUser("22000001");
    await signInAs(user);

    const res = await SET_PREF(
      put("/api/user/notification-preferences", {
        category: "MEMBERSHIP_DECISION",
        enabled: false,
      }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.notificationPreference.count()).toBe(0);
  });

  it("refuses a caller with no session", async () => {
    const res = await READ_PREFS(get("/api/user/notification-preferences"));

    expect(res.status).toBe(401);
  });

  it("writes against the session rather than anything in the body", async () => {
    const mine = await createUser("22000001");
    const other = await createUser("22000002");
    await signInAs(mine);

    await SET_PREF(
      put("/api/user/notification-preferences", {
        category: "QUIZ_ROUND",
        enabled: false,
        userId: other.id,
      }),
    );

    expect(await prisma.notificationPreference.count({ where: { userId: other.id } })).toBe(0);
    expect(await prisma.notificationPreference.count({ where: { userId: mine.id } })).toBe(1);
  });
});

const { announceOpenDay } = await import("@/lib/quizNotify");
const { DEFAULT_BOARDS, DEFAULT_CURVE } = await import("@/lib/competitionConfig");

const START = new Date("2026-08-01T08:00:00.000Z");

async function paidMember(phone: string, fullName: string) {
  const user = await subscriber(phone);
  await prisma.member.create({
    data: {
      userId: user.id,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 1000,
    },
  });
  return user;
}

async function runningCompetitionWithQuestions() {
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 1,
      visibility: "PUBLIC",
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
  const question = await prisma.quizQuestion.create({
    data: { text: "س", category: "عام", createdBy: "admin" },
  });
  const round = await prisma.quizRound.create({
    data: {
      competitionId: competition.id,
      index: 0,
      opensAt: START,
      closesAt: new Date(START.getTime() + 1440 * 60_000),
    },
  });
  await prisma.quizRoundQuestion.create({ data: { roundId: round.id, questionId: question.id } });
  return competition;
}

describe("the round announcement", () => {
  beforeEach(async () => {
    await resetDb();
    sent.calls = [];
  });

  it("narrows by eligibility and by preference together", async () => {
    const quiet = await paidMember("22000001", "صامت");
    const listening = await paidMember("22000002", "مستمع");
    await subscriber("22000003");
    await optOut(quiet.id, "QUIZ_ROUND");
    await runningCompetitionWithQuestions();

    await announceOpenDay(new Date(START.getTime() + 60_000));

    expect(sent.calls).toEqual([endpointOf(listening)]);
  });
});
