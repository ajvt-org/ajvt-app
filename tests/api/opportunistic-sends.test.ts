import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUser } from "./helpers";

const sendPushToUser = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/push", () => ({ sendPushToUser }));

const { sendMatchReminders } = await import("@/lib/tournamentNotify");
const { runDailyQuizAutoSend } = await import("@/lib/quiz");

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

describe("runDailyQuizAutoSend", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUser.mockClear();
  });

  it("sends the day's batch once", async () => {
    const user = await eligibleUserWithQuestion();

    await runDailyQuizAutoSend();

    expect(await prisma.quizAssignment.count({ where: { userId: user.id } })).toBe(1);
  });

  it("does not send a second batch when two requests race", async () => {
    const user = await eligibleUserWithQuestion();
    await prisma.quizQuestion.create({
      data: { text: "سؤال آخر", category: "عام", createdBy: "admin" },
    });

    await Promise.all([runDailyQuizAutoSend(), runDailyQuizAutoSend()]);

    expect(await prisma.quizAssignment.count({ where: { userId: user.id } })).toBe(1);
  });
});
