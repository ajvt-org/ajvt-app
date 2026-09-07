import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { entrantWording, tournament as messages } from "@/lib/messages";
import { resetDb, post, patch, del, get, signInAs, withParams, makeMember } from "./helpers";

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn(async () => {}),
  sendPushToUsers: vi.fn(async () => {}),
}));

const { POST: CREATE_TEAM, GET: MY_TEAM } = await import("@/app/api/teams/route");
const { POST: JOIN, DELETE: LEAVE } = await import("@/app/api/teams/[teamId]/join/route");
const { POST: INVITE, PATCH: ANSWER_INVITE } =
  await import("@/app/api/teams/[teamId]/invites/route");
const { DELETE: REMOVE } = await import("@/app/api/teams/[teamId]/members/route");
const { DELETE: DISBAND } = await import("@/app/api/teams/[teamId]/route");

const WORDS = entrantWording("team");
const PAST = new Date("2020-01-01T00:00:00.000Z");
const FUTURE = new Date("2099-01-01T00:00:00.000Z");

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

async function playerOn(teamId: string, activityId: string, fullName: string, captainId: string) {
  const guest = await registrant(activityId, fullName);
  await signInAsUser(captainId);
  await INVITE(
    post(`/api/teams/${teamId}/invites`, { userId: guest.userId }),
    withParams({ teamId }),
  );
  await signInAsUser(guest.userId);
  await ANSWER_INVITE(
    patch(`/api/teams/${teamId}/invites`, { accept: true }),
    withParams({ teamId }),
  );
  return guest;
}

const join = (teamId: string, userId: string) =>
  JOIN(post(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));

const leave = (teamId: string, userId: string) =>
  LEAVE(del(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));

const seat = (teamId: string, userId: string) =>
  prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });

describe("a player who has been accepted onto a team", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is free to leave while the tournament has not started", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);

    expect((await leave(team.id, player.userId)).status).toBe(200);
    expect(await seat(team.id, player.userId)).toBeNull();
  });

  it("frees the place at once, so the team can invite somebody else", async () => {
    const activity = await aTournament({ minTeamSize: 2, maxTeamSize: 2 });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    const waiting = await registrant(activity.id, "أحمد");

    await signInAsUser(member.userId);
    expect(
      (
        await INVITE(
          post(`/api/teams/${team.id}/invites`, { userId: waiting.userId }),
          withParams({ teamId: team.id }),
        )
      ).status,
    ).toBe(409);

    await signInAsUser(player.userId);
    await leave(team.id, player.userId);

    await signInAsUser(member.userId);
    expect(
      (
        await INVITE(
          post(`/api/teams/${team.id}/invites`, { userId: waiting.userId }),
          withParams({ teamId: team.id }),
        )
      ).status,
    ).toBe(201);
  });

  it("moves to another team by asking, and leaves the one it was in", async () => {
    const activity = await aTournament();
    const first = await captainWithTeam(activity.id, "محمد", "الصقور");
    const second = await captainWithTeam(activity.id, "الشيخ", "النسور");
    const player = await playerOn(first.team.id, activity.id, "سالم", first.member.userId);
    await signInAsUser(player.userId);

    expect((await join(second.team.id, player.userId)).status).toBe(200);
    expect(await seat(first.team.id, player.userId)).toBeNull();
    expect(await seat(second.team.id, player.userId)).toMatchObject({ status: "PENDING" });
  });

  it("accepts an invitation from another team, which moves them", async () => {
    const activity = await aTournament();
    const first = await captainWithTeam(activity.id, "محمد", "الصقور");
    const second = await captainWithTeam(activity.id, "الشيخ", "النسور");
    const player = await playerOn(first.team.id, activity.id, "سالم", first.member.userId);

    await signInAsUser(second.member.userId);
    await INVITE(
      post(`/api/teams/${second.team.id}/invites`, { userId: player.userId }),
      withParams({ teamId: second.team.id }),
    );
    await signInAsUser(player.userId);

    expect(
      (
        await ANSWER_INVITE(
          patch(`/api/teams/${second.team.id}/invites`, { accept: true }),
          withParams({ teamId: second.team.id }),
        )
      ).status,
    ).toBe(200);
    expect(await seat(first.team.id, player.userId)).toBeNull();
    expect(await seat(second.team.id, player.userId)).toMatchObject({ status: "ACTIVE" });
  });

  it("is told to hand the team over rather than walking away from a team it leads", async () => {
    const activity = await aTournament();
    const first = await captainWithTeam(activity.id, "محمد", "الصقور");
    const second = await captainWithTeam(activity.id, "الشيخ", "النسور");
    await playerOn(first.team.id, activity.id, "سالم", first.member.userId);
    await signInAsUser(first.member.userId);

    const away = await join(second.team.id, first.member.userId);

    expect(away.status).toBe(409);
    expect(await away.json()).toEqual({ error: messages.captainCannotLeave });
    expect(await seat(first.team.id, first.member.userId)).not.toBeNull();
  });
});

describe("once the tournament has started", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses to let a player leave, and says the tournament has started", async () => {
    const activity = await aTournament({ startsAt: FUTURE });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    await prisma.activity.update({ where: { id: activity.id }, data: { startsAt: PAST } });
    await signInAsUser(player.userId);

    const res = await leave(team.id, player.userId);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: WORDS.entrantChoiceLocked });
    expect(await seat(team.id, player.userId)).not.toBeNull();
  });

  it("refuses a new team, a join, an invitation, a removal and a disband", async () => {
    const activity = await aTournament({ startsAt: FUTURE });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    const outsider = await registrant(activity.id, "أحمد");
    await prisma.activity.update({ where: { id: activity.id }, data: { startsAt: PAST } });

    await signInAsUser(outsider.userId);
    expect(
      (await CREATE_TEAM(post("/api/teams", { activityId: activity.id, name: "الفرسان" }))).status,
    ).toBe(403);
    expect((await join(team.id, outsider.userId)).status).toBe(403);

    await signInAsUser(member.userId);
    expect(
      (
        await INVITE(
          post(`/api/teams/${team.id}/invites`, { userId: outsider.userId }),
          withParams({ teamId: team.id }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await REMOVE(
          del(`/api/teams/${team.id}/members`, { userId: player.userId }),
          withParams({ teamId: team.id }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await DISBAND(del(`/api/teams/${team.id}`), withParams({ teamId: team.id }))).status,
    ).toBe(403);

    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(1);
    expect(await prisma.teamMember.count()).toBe(2);
  });

  it("still lets the admin remove a player after the start", async () => {
    const { DELETE: ADMIN_REMOVE } =
      await import("@/app/api/admin/teams/[teamId]/members/[memberId]/route");
    const { createAdmin, signInAsAdmin } = await import("./helpers");
    const activity = await aTournament({ startsAt: FUTURE });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    await prisma.activity.update({ where: { id: activity.id }, data: { startsAt: PAST } });
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_REMOVE(del(`/api/admin/teams/${team.id}/members/${player.userId}`), {
      params: Promise.resolve({ teamId: team.id, memberId: player.userId }),
    });

    expect(res.status).toBe(200);
    expect(await seat(team.id, player.userId)).toBeNull();
  });

  it("still lets the player read their team", async () => {
    const activity = await aTournament({ startsAt: FUTURE });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    await playerOn(team.id, activity.id, "سالم", member.userId);
    await prisma.activity.update({ where: { id: activity.id }, data: { startsAt: PAST } });
    await signInAsUser(member.userId);

    const body = await (await MY_TEAM(get(`/api/teams?activityId=${activity.id}`))).json();

    expect(body.locked).toBe(true);
    expect(body.team.name).toBe("الصقور");
  });
});

describe("a tournament with no start date", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("never locks, so a player stays free", async () => {
    const activity = await aTournament({ startsAt: null });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const player = await playerOn(team.id, activity.id, "سالم", member.userId);
    await signInAsUser(player.userId);

    expect((await leave(team.id, player.userId)).status).toBe(200);
  });
});

describe("a tournament the admin arranges", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("still locks a player the moment they are accepted, with the wording it had", async () => {
    const activity = await aTournament({ playersBuildTeams: false, startsAt: null });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
    const player = await registrant(activity.id, "سالم");
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: player.userId, status: "ACTIVE" },
    });
    await signInAsUser(player.userId);

    const res = await leave(team.id, player.userId);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: WORDS.entrantChoiceSettled });
    expect(await seat(team.id, player.userId)).not.toBeNull();
  });

  it("still lets a player who is only waiting cancel their request", async () => {
    const activity = await aTournament({ playersBuildTeams: false });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
    const player = await registrant(activity.id, "سالم");
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: player.userId, status: "PENDING" },
    });
    await signInAsUser(player.userId);

    expect((await leave(team.id, player.userId)).status).toBe(200);
    expect(await seat(team.id, player.userId)).toBeNull();
  });
});
