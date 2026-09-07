import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { tournament as messages, entrantWording } from "@/lib/messages";
import { resetDb, post, patch, del, signInAs, withParams, makeMember } from "./helpers";

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn(async () => {}),
  sendPushToUsers: vi.fn(async () => {}),
}));

const { POST: CREATE_TEAM } = await import("@/app/api/teams/route");
const { POST: JOIN } = await import("@/app/api/teams/[teamId]/join/route");
const { POST: INVITE } = await import("@/app/api/teams/[teamId]/invites/route");
const { PATCH: ANSWER_REQUEST, DELETE: REMOVE } =
  await import("@/app/api/teams/[teamId]/members/route");
const { PATCH: HAND_OVER, DELETE: DISBAND } = await import("@/app/api/teams/[teamId]/route");

async function aTournament(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: {
      title: "دوري الأزواج",
      description: "بطولة",
      isTournament: true,
      isOpen: true,
      playersBuildTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      ...over,
    },
  });
}

async function registrant(activityId: string, fullName: string) {
  const member = await makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
  await prisma.activityRegistration.create({
    data: { userId: member.userId, activityId, status: "ACTIVE" },
  });
  return member;
}

async function signInAsUser(userId: string) {
  await signInAs(await prisma.user.findUniqueOrThrow({ where: { id: userId } }));
}

async function captainWithTeam(activityId: string, fullName: string, name: string) {
  const member = await registrant(activityId, fullName);
  await signInAsUser(member.userId);
  await CREATE_TEAM(post("/api/teams", { activityId, name }));
  const team = await prisma.team.findFirstOrThrow({ where: { activityId, name } });
  return { member, team };
}

async function asksToJoin(teamId: string, userId: string) {
  await signInAsUser(userId);
  await JOIN(post(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));
}

async function playerOn(teamId: string, activityId: string, fullName: string, captainId: string) {
  const guest = await registrant(activityId, fullName);
  await signInAsUser(captainId);
  await INVITE(
    post(`/api/teams/${teamId}/invites`, { userId: guest.userId }),
    withParams({ teamId }),
  );
  await signInAsUser(guest.userId);
  const { PATCH: ANSWER } = await import("@/app/api/teams/[teamId]/invites/route");
  await ANSWER(patch(`/api/teams/${teamId}/invites`, { accept: true }), withParams({ teamId }));
  await signInAsUser(captainId);
  return guest;
}

const answerRequest = (teamId: string, userId: string, accept: boolean) =>
  ANSWER_REQUEST(patch(`/api/teams/${teamId}/members`, { userId, accept }), withParams({ teamId }));

const remove = (teamId: string, userId: string) =>
  REMOVE(del(`/api/teams/${teamId}/members`, { userId }), withParams({ teamId }));

const handOver = (teamId: string, captainUserId: string) =>
  HAND_OVER(patch(`/api/teams/${teamId}`, { captainUserId }), withParams({ teamId }));

const disband = (teamId: string) => DISBAND(del(`/api/teams/${teamId}`), withParams({ teamId }));

const seat = (teamId: string, userId: string) =>
  prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });

describe("a captain answering a request to join", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("accepts it with no admin in the way", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const asker = await registrant(activity.id, "أحمد");
    await asksToJoin(team.id, asker.userId);
    await signInAsUser(member.userId);

    expect((await answerRequest(team.id, asker.userId, true)).status).toBe(200);
    expect(await seat(team.id, asker.userId)).toMatchObject({ status: "ACTIVE" });
  });

  it("declines it and leaves the registrant free to ask again", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const asker = await registrant(activity.id, "أحمد");
    await asksToJoin(team.id, asker.userId);
    await signInAsUser(member.userId);

    expect((await answerRequest(team.id, asker.userId, false)).status).toBe(200);
    expect(await seat(team.id, asker.userId)).toBeNull();

    await asksToJoin(team.id, asker.userId);
    expect(await seat(team.id, asker.userId)).toMatchObject({ status: "PENDING" });
  });

  it("refuses anyone but the captain", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    const asker = await registrant(activity.id, "أحمد");
    await asksToJoin(team.id, asker.userId);
    await signInAsUser(player.userId);

    expect((await answerRequest(team.id, asker.userId, true)).status).toBe(403);
  });

  it("answers nothing on an invitation the captain sent", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد");
    await signInAsUser(member.userId);
    await INVITE(
      post(`/api/teams/${team.id}/invites`, { userId: guest.userId }),
      withParams({ teamId: team.id }),
    );

    const res = await answerRequest(team.id, guest.userId, true);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: messages.requestNotFound });
  });

  it("refuses to accept into a team that has filled up", async () => {
    const activity = await aTournament({ minTeamSize: 2, maxTeamSize: 2 });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    await playerOn(team.id, activity.id, "سالم", member.userId);
    const asker = await registrant(activity.id, "أحمد");
    await asksToJoin(team.id, asker.userId);
    await signInAsUser(member.userId);

    expect((await answerRequest(team.id, asker.userId, true)).status).toBe(409);
  });
});

describe("a captain removing a player", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes them off the team", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);

    expect((await remove(team.id, player.userId)).status).toBe(200);
    expect(await seat(team.id, player.userId)).toBeNull();
  });

  it("refuses to remove the captain while they still lead it", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    await playerOn(team.id, activity.id, "سالم", member.userId);

    const res = await remove(team.id, member.userId);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: messages.captainCannotLeave });
    expect(await seat(team.id, member.userId)).not.toBeNull();
  });
});

describe("a captain handing the team over", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("moves the captaincy to another player, who can then remove the old captain", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);

    expect((await handOver(team.id, player.userId)).status).toBe(200);
    expect((await prisma.team.findUniqueOrThrow({ where: { id: team.id } })).captainUserId).toBe(
      player.userId,
    );

    await signInAsUser(player.userId);
    expect((await remove(team.id, member.userId)).status).toBe(200);
    expect(await seat(team.id, member.userId)).toBeNull();
  });

  it("refuses to hand it to somebody who is not on the roster", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const outsider = await registrant(activity.id, "أحمد");

    const res = await handOver(team.id, outsider.userId);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: entrantWording("team").captainNotInEntrant,
    });
  });

  it("refuses to hand it to somebody who has only been invited", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد");
    await signInAsUser(member.userId);
    await INVITE(
      post(`/api/teams/${team.id}/invites`, { userId: guest.userId }),
      withParams({ teamId: team.id }),
    );

    expect((await handOver(team.id, guest.userId)).status).toBe(400);
  });
});

describe("a captain disbanding the team", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns every player to having no team", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    await playerOn(team.id, activity.id, "سالم", member.userId);

    expect((await disband(team.id)).status).toBe(200);
    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(0);
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("refuses anyone but the captain", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    await signInAsUser(player.userId);

    expect((await disband(team.id)).status).toBe(403);
    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(1);
  });

  it("leaves a team with matches to the admin", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const other = await prisma.team.create({ data: { activityId: activity.id, name: "النسور" } });
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: team.id, awayTeamId: other.id },
    });

    const res = await disband(team.id);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: messages.teamHasMatches });
  });
});

describe("the admin route that approves a request", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is still there for a tournament the admin arranges", async () => {
    const { PATCH: ADMIN_APPROVE } =
      await import("@/app/api/admin/teams/[teamId]/members/[memberId]/route");
    const { createAdmin, signInAsAdmin } = await import("./helpers");
    const activity = await aTournament({ playersBuildTeams: false });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
    const asker = await registrant(activity.id, "أحمد");
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: asker.userId, status: "PENDING" },
    });
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_APPROVE(
      patch(`/api/admin/teams/${team.id}/members/${asker.userId}`, {}),
      { params: Promise.resolve({ teamId: team.id, memberId: asker.userId }) },
    );

    expect(res.status).toBe(200);
    expect(await seat(team.id, asker.userId)).toMatchObject({ status: "ACTIVE" });
  });
});
