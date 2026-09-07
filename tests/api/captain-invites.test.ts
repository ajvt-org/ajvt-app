import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { tournament as messages } from "@/lib/messages";
import { resetDb, post, patch, signInAs, withParams, makeMember } from "./helpers";

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn(async () => {}),
  sendPushToUsers: vi.fn(async () => {}),
}));

const { POST: CREATE_TEAM } = await import("@/app/api/teams/route");
const { POST: INVITE, PATCH: ANSWER } = await import("@/app/api/teams/[teamId]/invites/route");
const { POST: JOIN } = await import("@/app/api/teams/[teamId]/join/route");
const { sendPushToUser } = await import("@/lib/push");

async function aTournament(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: {
      title: "دوري الأزواج",
      description: "بطولة",
      isTournament: true,
      isOpen: true,
      playersBuildTeams: true,
      minTeamSize: 2,
      maxTeamSize: 3,
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

const invite = (teamId: string, userId: string) =>
  INVITE(post(`/api/teams/${teamId}/invites`, { userId }), withParams({ teamId }));

const answer = (teamId: string, accept: boolean) =>
  ANSWER(patch(`/api/teams/${teamId}/invites`, { accept }), withParams({ teamId }));

const seat = (teamId: string, userId: string) =>
  prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });

describe("a captain inviting a player", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("writes a waiting row the captain started", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد ولد سالم");

    expect((await invite(team.id, guest.userId)).status).toBe(201);
    expect(await seat(team.id, guest.userId)).toMatchObject({
      status: "PENDING",
      invitedByCaptain: true,
    });
  });

  it("reaches the invited player on the team choice notification", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد ولد سالم");

    await invite(team.id, guest.userId);

    expect(sendPushToUser).toHaveBeenCalledWith(
      guest.userId,
      expect.anything(),
      "TEAM_CHOICE_REMINDER",
    );
  });

  it("refuses anyone but the captain", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const other = await registrant(activity.id, "سالم");
    const guest = await registrant(activity.id, "أحمد");
    await signInAsUser(other.userId);

    const res = await invite(team.id, guest.userId);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: messages.captainOnly });
  });

  it("refuses somebody not registered on the tournament", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const stranger = await makeMember({
      fullName: "غريب",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });

    const res = await invite(team.id, stranger.userId);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: messages.inviteeNotRegistered });
  });

  it("refuses somebody already in the team", async () => {
    const activity = await aTournament();
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");

    const res = await invite(team.id, member.userId);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: messages.alreadyOnThisTeam });
  });

  it("refuses once the team is full", async () => {
    const activity = await aTournament({ minTeamSize: 2, maxTeamSize: 2 });
    const { member, team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const partner = await registrant(activity.id, "أحمد");
    await invite(team.id, partner.userId);
    await signInAsUser(partner.userId);
    await answer(team.id, true);
    await signInAsUser(member.userId);
    const third = await registrant(activity.id, "سالم");

    expect((await invite(team.id, third.userId)).status).toBe(409);
    expect(await seat(team.id, third.userId)).toBeNull();
  });

  it("invites somebody already in another team", async () => {
    const activity = await aTournament();
    const other = await captainWithTeam(activity.id, "سالم", "النسور");
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");

    expect((await invite(team.id, other.member.userId)).status).toBe(201);
  });

  it("turns a request already waiting into an invitation the captain owns", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const asker = await registrant(activity.id, "أحمد");
    await signInAsUser(asker.userId);
    await JOIN(
      post(`/api/teams/${team.id}/join`, { userId: asker.userId }),
      withParams({ teamId: team.id }),
    );

    const captain = await prisma.team.findUniqueOrThrow({ where: { id: team.id } });
    await signInAsUser(captain.captainUserId!);
    expect((await invite(team.id, asker.userId)).status).toBe(201);
    expect(await seat(team.id, asker.userId)).toMatchObject({ invitedByCaptain: true });
  });
});

describe("the invited player answering", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("joins the team with nobody else to approve it", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد");
    await invite(team.id, guest.userId);
    await signInAsUser(guest.userId);

    expect((await answer(team.id, true)).status).toBe(200);
    expect(await seat(team.id, guest.userId)).toMatchObject({ status: "ACTIVE" });
  });

  it("leaves nothing behind when it declines, so the same team can ask again", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد");
    await invite(team.id, guest.userId);
    await signInAsUser(guest.userId);

    expect((await answer(team.id, false)).status).toBe(200);
    expect(await seat(team.id, guest.userId)).toBeNull();

    const captainId = (await prisma.team.findUniqueOrThrow({ where: { id: team.id } }))
      .captainUserId!;
    await signInAsUser(captainId);
    expect((await invite(team.id, guest.userId)).status).toBe(201);
  });

  it("clears every other seat the player held on that tournament", async () => {
    const activity = await aTournament();
    const first = await captainWithTeam(activity.id, "سالم", "النسور");
    const second = await captainWithTeam(activity.id, "محمد", "الصقور");
    const guest = await registrant(activity.id, "أحمد");
    await invite(second.team.id, guest.userId);
    await signInAsUser(first.member.userId);
    await invite(first.team.id, guest.userId);
    await signInAsUser(guest.userId);

    await answer(second.team.id, true);

    expect(await seat(second.team.id, guest.userId)).toMatchObject({ status: "ACTIVE" });
    expect(await seat(first.team.id, guest.userId)).toBeNull();
  });

  it("refuses a player already accepted onto another team, which the lock issue lifts", async () => {
    const activity = await aTournament();
    const settled = await captainWithTeam(activity.id, "سالم", "النسور");
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    await invite(team.id, settled.member.userId);
    await signInAsUser(settled.member.userId);

    expect((await answer(team.id, true)).status).toBe(403);
    expect(await seat(team.id, settled.member.userId)).toMatchObject({ status: "PENDING" });
  });

  it("answers nothing when there is no invitation, only a request", async () => {
    const activity = await aTournament();
    const { team } = await captainWithTeam(activity.id, "محمد", "الصقور");
    const asker = await registrant(activity.id, "أحمد");
    await signInAsUser(asker.userId);
    await JOIN(
      post(`/api/teams/${team.id}/join`, { userId: asker.userId }),
      withParams({ teamId: team.id }),
    );

    const res = await answer(team.id, true);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: messages.invitationNotFound });
  });
});
