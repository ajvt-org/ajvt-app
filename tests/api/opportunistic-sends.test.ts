import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUser, makeMember } from "./helpers";

const sendPushToUsers = vi.hoisted(() =>
  vi.fn<(userIds: string[], payload: { title: string; body: string }) => Promise<void>>(
    async () => {},
  ),
);
vi.mock("@/lib/push", () => ({ sendPushToUsers, sendPushToUser: vi.fn(async () => {}) }));

const notified = () => sendPushToUsers.mock.calls.flatMap((call) => call[0]);

const { sendMatchReminders } = await import("@/lib/tournamentNotify");
const { announceOpenDay } = await import("@/lib/quizNotify");
const { DEFAULT_BOARDS, DEFAULT_CURVE } = await import("@/lib/competitionConfig");

async function scheduledMatch() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "…", isTournament: true },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const user = await createUser("22000001");
  const member = await makeMember({
    fullName: "لاعب",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    userId: user.id,
    status: "ACTIVE",
  });
  await prisma.teamMember.create({
    data: { teamId: home.id, memberId: member.id, userId: member.userId },
  });

  return prisma.match.create({
    data: {
      activityId: activity.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      matchDate: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

describe("sendMatchReminders", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUsers.mockClear();
  });

  it("notifies a team once", async () => {
    await scheduledMatch();

    await sendMatchReminders();

    expect(notified()).toHaveLength(1);
  });

  it("does not notify twice when two requests race", async () => {
    await scheduledMatch();

    await Promise.all([sendMatchReminders(), sendMatchReminders()]);

    expect(notified()).toHaveLength(1);
  });
});

async function eligibleUserWithQuestion() {
  const user = await createUser("22000002");
  await makeMember({
    fullName: "عضو",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    userId: user.id,
    status: "ACTIVE",
    paidAmount: 100,
  });
  await prisma.quizQuestion.create({
    data: { text: "سؤال", category: "عام", createdBy: "admin" },
  });
  return user;
}

function openedAnHourAgo() {
  return new Date(Date.now() - 3_600_000);
}

async function openDayWithQuestions() {
  const startsAt = openedAnHourAgo();
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt,
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 1,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
    },
  });
  const day = await prisma.quizRound.create({
    data: {
      competitionId: competition.id,
      index: 0,
      opensAt: startsAt,
      closesAt: new Date(startsAt.getTime() + 1440 * 60_000),
    },
  });
  const question = await prisma.quizQuestion.create({
    data: { text: "سؤال", category: "عام", createdBy: "admin" },
  });
  await prisma.quizRoundQuestion.create({ data: { roundId: day.id, questionId: question.id } });
  return { competition, day };
}

describe("announceOpenDay", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUsers.mockClear();
  });

  it("tells every eligible member once the round is open", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();

    const sent = await announceOpenDay();

    expect(sent).toBe(1);
    expect(notified()).toHaveLength(1);
  });

  it("does not announce the same round twice when two requests race", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();

    await Promise.all([announceOpenDay(), announceOpenDay()]);

    expect(notified()).toHaveLength(1);
  });

  it("says nothing when the round has no questions loaded", async () => {
    await eligibleUserWithQuestion();
    const startsAt = openedAnHourAgo();
    const competition = await prisma.competition.create({
      data: {
        name: "مسابقة",
        startsAt,
        roundCount: 3,
        roundPeriodMinutes: 1440,
        roundWindowMinutes: 1440,
        servedCount: 1,
        boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
        ...DEFAULT_CURVE,
        startedAt: new Date(),
      },
    });
    await prisma.quizRound.create({
      data: {
        competitionId: competition.id,
        index: 0,
        opensAt: startsAt,
        closesAt: new Date(startsAt.getTime() + 1440 * 60_000),
      },
    });

    expect(await announceOpenDay()).toBe(0);
    expect(notified()).toEqual([]);
  });

  it("says nothing before the competition is launched", async () => {
    await eligibleUserWithQuestion();
    const { competition } = await openDayWithQuestions();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { startedAt: null },
    });

    expect(await announceOpenDay()).toBe(0);
  });

  it("announces each running competition on its own", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();
    await openDayWithQuestions();

    expect(await announceOpenDay()).toBe(2);
    expect(notified()).toHaveLength(2);
  });

  it("tells only the listed members about a private competition", async () => {
    const listed = await eligibleUserWithQuestion();
    await createUser("22000003");
    const { competition } = await openDayWithQuestions();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { visibility: "PRIVATE" },
    });
    await prisma.quizParticipant.create({
      data: { competitionId: competition.id, userId: listed.id },
    });

    expect(await announceOpenDay()).toBe(1);
    expect(notified()).toEqual([listed.id]);
  });

  it("skips a listed member who is no longer a paid member", async () => {
    const user = await createUser("22000004");
    const { competition } = await openDayWithQuestions();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { visibility: "PRIVATE" },
    });
    await prisma.quizParticipant.create({
      data: { competitionId: competition.id, userId: user.id },
    });

    expect(await announceOpenDay()).toBe(0);
  });

  it("says nothing once the round has closed", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();

    expect(await announceOpenDay(new Date(Date.now() + 3 * 1440 * 60_000))).toBe(0);
  });
});
