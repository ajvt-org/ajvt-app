import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUser } from "./helpers";

const sendPushToUser = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/push", () => ({ sendPushToUser }));

const { sendMatchReminders } = await import("@/lib/tournamentNotify");
const { announceOpenDay } = await import("@/lib/quizNotify");
const { DEFAULT_BANDS } = await import("@/lib/competitionConfig");

async function scheduledMatch() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "…", isTournament: true },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const user = await createUser("22000001");
  const member = await prisma.member.create({
    data: {
      fullName: "لاعب",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      userId: user.id,
      status: "ACTIVE",
    },
  });
  await prisma.teamMember.create({ data: { teamId: home.id, memberId: member.id } });

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
    sendPushToUser.mockClear();
  });

  it("notifies a team once", async () => {
    await scheduledMatch();

    await sendMatchReminders();

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("does not notify twice when two requests race", async () => {
    await scheduledMatch();

    await Promise.all([sendMatchReminders(), sendMatchReminders()]);

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });
});

async function eligibleUserWithQuestion() {
  const user = await createUser("22000002");
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
  await prisma.quizQuestion.create({
    data: { text: "سؤال", category: "عام", createdBy: "admin" },
  });
  return user;
}

async function openDayWithQuestions() {
  const today = new Date().toISOString().slice(0, 10);
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsOn: today,
      days: 3,
      publishMinutes: 0,
      cutoffMinutes: 1439,
      servedCount: 1,
      poolSize: 1,
      weeklyCountingDays: 6,
      speedBands: DEFAULT_BANDS as unknown as object,
      startedAt: new Date(),
    },
  });
  const day = await prisma.quizDay.create({
    data: { competitionId: competition.id, day: today },
  });
  const question = await prisma.quizQuestion.create({
    data: { text: "سؤال", category: "عام", createdBy: "admin" },
  });
  await prisma.quizDayQuestion.create({ data: { dayId: day.id, questionId: question.id } });
  return { competition, day };
}

describe("announceOpenDay", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUser.mockClear();
  });

  it("tells every eligible member once the day is open", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();

    const sent = await announceOpenDay();

    expect(sent).toBe(1);
    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("does not announce the same day twice when two requests race", async () => {
    await eligibleUserWithQuestion();
    await openDayWithQuestions();

    await Promise.all([announceOpenDay(), announceOpenDay()]);

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("says nothing when the day has no questions loaded", async () => {
    await eligibleUserWithQuestion();
    const today = new Date().toISOString().slice(0, 10);
    const competition = await prisma.competition.create({
      data: {
        name: "مسابقة",
        startsOn: today,
        days: 3,
        publishMinutes: 0,
        cutoffMinutes: 1439,
        servedCount: 1,
        poolSize: 1,
        weeklyCountingDays: 6,
        speedBands: DEFAULT_BANDS as unknown as object,
        startedAt: new Date(),
      },
    });
    await prisma.quizDay.create({ data: { competitionId: competition.id, day: today } });

    expect(await announceOpenDay()).toBe(0);
    expect(sendPushToUser).not.toHaveBeenCalled();
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

  it("says nothing once the day has closed", async () => {
    await eligibleUserWithQuestion();
    const { competition } = await openDayWithQuestions();
    await prisma.competition.update({
      where: { id: competition.id },
      data: { publishMinutes: 0, cutoffMinutes: 1 },
    });

    expect(await announceOpenDay(new Date(`${competition.startsOn}T12:00:00.000Z`))).toBe(0);
  });
});
