import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  del,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { DELETE: ADMIN_UNREGISTER, PATCH: REVIEW } =
  await import("@/app/api/admin/activities/[id]/register/route");
const { DELETE: SELF_UNREGISTER } = await import("@/app/api/activities/register/route");

async function aTournament(over: Record<string, unknown> = {}) {
  const activity = await prisma.activity.create({
    data: {
      title: "دوري القرية",
      description: "بطولة",
      isOpen: true,
      isTournament: true,
      minTeamSize: 5,
      maxTeamSize: 7,
      ...over,
    },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "النسور" } });
  return { activity, home, away };
}

async function aPlayer(phone: string, fullName: string) {
  const user = await createUser(phone);
  const member = await makeMember({ fullName, age: "البدريين", status: "ACTIVE", userId: user.id });
  return { user, userId: member.userId as string };
}

async function place(activityId: string, teamId: string, userId: string) {
  await prisma.activityRegistration.create({
    data: { userId, activityId, status: "ACTIVE", source: "SELF" },
  });
  await prisma.teamMember.create({ data: { teamId, userId, status: "ACTIVE" } });
}

const placeCount = (activityId: string, userId: string) =>
  prisma.teamMember.count({ where: { userId, team: { activityId } } });

const adminRemoves = (activityId: string, userId: string) =>
  ADMIN_UNREGISTER(
    del(`/api/admin/activities/${activityId}/register`, { userId }),
    withId(activityId),
  );

describe("an admin taking a player out of a tournament of teams", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes the team place with the registration", async () => {
    const { activity, home } = await aTournament();
    const { userId } = await aPlayer("22000200", "محمد");
    await place(activity.id, home.id, userId);

    const res = await adminRemoves(activity.id, userId);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, keptTeamPlace: false });
    expect(await placeCount(activity.id, userId)).toBe(0);
    expect(await prisma.activityRegistration.count({ where: { userId } })).toBe(0);
  });

  it("keeps the team once it empties", async () => {
    const { activity, home } = await aTournament();
    const { userId } = await aPlayer("22000201", "أحمد");
    await place(activity.id, home.id, userId);

    await adminRemoves(activity.id, userId);

    expect(await prisma.team.findUnique({ where: { id: home.id } })).not.toBeNull();
  });

  it("leaves the captain on the team and says the place was kept", async () => {
    const { activity, home } = await aTournament();
    const { userId } = await aPlayer("22000202", "سالم");
    await place(activity.id, home.id, userId);
    await prisma.team.update({ where: { id: home.id }, data: { captainUserId: userId } });

    const res = await adminRemoves(activity.id, userId);

    expect(await res.json()).toMatchObject({ ok: true, keptTeamPlace: true });
    expect(await placeCount(activity.id, userId)).toBe(1);
    expect(await prisma.activityRegistration.count({ where: { userId } })).toBe(0);
  });

  it("leaves somebody who has already scored on the team", async () => {
    const { activity, home, away } = await aTournament();
    const { userId } = await aPlayer("22000203", "علي");
    await place(activity.id, home.id, userId);
    const match = await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });
    await prisma.matchGoal.create({ data: { matchId: match.id, teamId: home.id, userId } });

    const res = await adminRemoves(activity.id, userId);

    expect(await res.json()).toMatchObject({ keptTeamPlace: true });
    expect(await placeCount(activity.id, userId)).toBe(1);
  });

  it("leaves somebody booked in a match the team played", async () => {
    const { activity, home, away } = await aTournament();
    const { userId } = await aPlayer("22000204", "خالد");
    await place(activity.id, home.id, userId);
    const match = await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });
    await prisma.matchBooking.create({
      data: { matchId: match.id, teamId: home.id, userId, cardType: "YELLOW" },
    });

    await adminRemoves(activity.id, userId);

    expect(await placeCount(activity.id, userId)).toBe(1);
  });

  it("leaves a candidate in the vote on a match the team played", async () => {
    const { activity, home, away } = await aTournament();
    const { userId } = await aPlayer("22000205", "ياسر");
    await place(activity.id, home.id, userId);
    const match = await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });
    const vote = await prisma.matchMvpVote.create({
      data: { matchId: match.id, closesAt: new Date(Date.now() + 3600_000) },
    });
    await prisma.mvpCandidate.create({ data: { voteId: vote.id, userId } });

    await adminRemoves(activity.id, userId);

    expect(await placeCount(activity.id, userId)).toBe(1);
  });

  it("leaves a player who is on no team alone and runs twice without complaint", async () => {
    const { activity } = await aTournament();
    const { userId } = await aPlayer("22000206", "عمر");
    await prisma.activityRegistration.create({
      data: { userId, activityId: activity.id, status: "ACTIVE", source: "SELF" },
    });

    expect((await adminRemoves(activity.id, userId)).status).toBe(200);
    expect((await adminRemoves(activity.id, userId)).status).toBe(200);
    expect(await placeCount(activity.id, userId)).toBe(0);
  });

  it("leaves a place in another tournament alone", async () => {
    const { activity, home } = await aTournament();
    const other = await aTournament({ title: "بطولة أخرى" });
    const { userId } = await aPlayer("22000207", "فهد");
    await place(activity.id, home.id, userId);
    await place(other.activity.id, other.home.id, userId);

    await adminRemoves(activity.id, userId);

    expect(await placeCount(activity.id, userId)).toBe(0);
    expect(await placeCount(other.activity.id, userId)).toBe(1);
  });

  it("takes the place when a registration is rejected rather than deleted", async () => {
    const { activity, home } = await aTournament();
    const { userId } = await aPlayer("22000208", "بدر");
    await place(activity.id, home.id, userId);
    const row = await prisma.activityRegistration.findFirstOrThrow({ where: { userId } });

    const res = await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: row.id,
        status: "REJECTED",
        reason: "لا يوجد مكان",
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect(await placeCount(activity.id, userId)).toBe(0);
  });
});

describe("a member taking themselves out of a tournament of teams", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes the team place with the registration", async () => {
    const { activity, home } = await aTournament();
    const { user, userId } = await aPlayer("22000210", "محمود");
    await place(activity.id, home.id, userId);
    await signInAs(user);

    const res = await SELF_UNREGISTER(
      del("/api/activities/register", { activityId: activity.id, userId }),
    );

    expect(res.status).toBe(200);
    expect(await placeCount(activity.id, userId)).toBe(0);
  });

  it("leaves a captain their place", async () => {
    const { activity, home } = await aTournament();
    const { user, userId } = await aPlayer("22000211", "طارق");
    await place(activity.id, home.id, userId);
    await prisma.team.update({ where: { id: home.id }, data: { captainUserId: userId } });
    await signInAs(user);

    const res = await SELF_UNREGISTER(
      del("/api/activities/register", { activityId: activity.id, userId }),
    );

    expect(await res.json()).toMatchObject({ keptTeamPlace: true });
    expect(await placeCount(activity.id, userId)).toBe(1);
  });
});

describe("a tournament of players", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("still deletes the wrapper team the app gave the entrant", async () => {
    const { activity } = await aTournament({ minTeamSize: 1, maxTeamSize: 1 });
    const { userId } = await aPlayer("22000220", "زياد");
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: "زياد", autoNamed: true },
    });
    await place(activity.id, team.id, userId);

    await adminRemoves(activity.id, userId);

    expect(await prisma.team.findUnique({ where: { id: team.id } })).toBeNull();
    expect(await placeCount(activity.id, userId)).toBe(0);
  });

  it("keeps the wrapper team of an entrant who has played", async () => {
    const { activity, home } = await aTournament({ minTeamSize: 1, maxTeamSize: 1 });
    const { userId } = await aPlayer("22000221", "وليد");
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: "وليد", autoNamed: true },
    });
    await place(activity.id, team.id, userId);
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: team.id, awayTeamId: home.id },
    });

    await adminRemoves(activity.id, userId);

    expect(await prisma.team.findUnique({ where: { id: team.id } })).not.toBeNull();
    expect(await placeCount(activity.id, userId)).toBe(1);
  });
});
