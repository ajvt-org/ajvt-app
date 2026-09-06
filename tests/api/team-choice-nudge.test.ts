import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUser, makeMember } from "./helpers";
import { fromClubWallClock } from "@/lib/clubTime";

const sendPushToUser = vi.fn<(userId: string, payload: unknown, category: string) => Promise<void>>(
  async () => {},
);
vi.mock("@/lib/push", () => ({
  sendPushToUser: (userId: string, payload: unknown, category: string) =>
    sendPushToUser(userId, payload, category),
  sendPushToUsers: vi.fn(async () => {}),
}));

const { sendTeamChoiceReminders } = await import("@/lib/tournamentNotify");

const MIDDAY = fromClubWallClock(Date.UTC(2026, 8, 20, 12, 0));
const MIDNIGHT = fromClubWallClock(Date.UTC(2026, 8, 20, 23, 30));

async function tournamentWithMember(phone: string, over: Record<string, unknown> = {}) {
  const activity = await prisma.activity.create({
    data: {
      title: "دوري القرية",
      description: "بطولة",
      isTournament: true,
      isOpen: true,
      ...over,
    },
  });
  const team = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
  const user = await createUser(phone);
  const member = await makeMember({
    fullName: "عضو",
    age: "البدريين",
    status: "ACTIVE",
    userId: user.id,
  });
  const registration = await prisma.activityRegistration.create({
    data: { userId: member.userId, activityId: activity.id, status: "ACTIVE" },
  });
  return { activity, team, member, registration };
}

const rowFor = (id: string) => prisma.activityRegistration.findUniqueOrThrow({ where: { id } });

describe("the nudge for a player with no team", () => {
  beforeEach(async () => {
    await resetDb();
    sendPushToUser.mockClear();
    vi.setSystemTime(MIDDAY);
  });

  it("reminds a registered member who has not joined a team", async () => {
    const { registration } = await tournamentWithMember("22000200");

    await sendTeamChoiceReminders();

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
    expect(sendPushToUser.mock.calls[0][2]).toBe("TEAM_CHOICE_REMINDER");
    expect((await rowFor(registration.id)).teamNudgeSentAt).not.toBeNull();
  });

  it("sends nothing for a tournament played one against one, which has no team to choose", async () => {
    await tournamentWithMember("22000210", { minTeamSize: 1, maxTeamSize: 1 });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("does not send twice inside the hour", async () => {
    await tournamentWithMember("22000201");

    await sendTeamChoiceReminders();
    await sendTeamChoiceReminders();

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("sends again once the hour has passed", async () => {
    await tournamentWithMember("22000202");
    await sendTeamChoiceReminders();

    vi.setSystemTime(new Date(MIDDAY.getTime() + 61 * 60 * 1000));
    await sendTeamChoiceReminders();

    expect(sendPushToUser).toHaveBeenCalledTimes(2);
  });

  it("stops the moment a team appears", async () => {
    const { member, team } = await tournamentWithMember("22000203");
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.userId, status: "ACTIVE" },
    });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("stops when a team is only waiting on an admin", async () => {
    const { member, team } = await tournamentWithMember("22000204");
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.userId, status: "PENDING" },
    });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("stops when registration closes", async () => {
    await tournamentWithMember("22000205", { isOpen: false });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("stops once the tournament has started", async () => {
    await tournamentWithMember("22000206", {
      startsAt: new Date(MIDDAY.getTime() - 86_400_000),
    });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("leaves a registration that is still pending alone", async () => {
    const { registration } = await tournamentWithMember("22000207");
    await prisma.activityRegistration.update({
      where: { id: registration.id },
      data: { status: "PENDING" },
    });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("says nothing through the night", async () => {
    await tournamentWithMember("22000208");
    vi.setSystemTime(MIDNIGHT);

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("leaves an activity that is not a tournament alone", async () => {
    await tournamentWithMember("22000209", { isTournament: false });

    await sendTeamChoiceReminders();

    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});
