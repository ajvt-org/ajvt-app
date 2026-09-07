import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  patch,
  del,
  get,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withParams,
  withId,
  makeMember,
} from "./helpers";

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn(async () => {}),
  sendPushToUsers: vi.fn(async () => {}),
}));

const { POST: CREATE_TEAM } = await import("@/app/api/teams/route");
const { POST: INVITE } = await import("@/app/api/teams/[teamId]/invites/route");
const { POST: JOIN } = await import("@/app/api/teams/[teamId]/join/route");
const { GET: ADMIN_TEAMS } = await import("@/app/api/admin/activities/[id]/teams/route");
const { GET: ADMIN_ROSTER } = await import("@/app/api/admin/activities/[id]/roster/route");
const { POST: ADMIN_ADD } = await import("@/app/api/admin/teams/[teamId]/members/route");
const { DELETE: ADMIN_REMOVE } =
  await import("@/app/api/admin/teams/[teamId]/members/[memberId]/route");
const { PATCH: ADMIN_TEAM, DELETE: ADMIN_DELETE_TEAM } =
  await import("@/app/api/admin/teams/[teamId]/route");

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
      startsAt: FUTURE,
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

async function aTeamBuiltByAPlayer(activityId: string) {
  const captain = await registrant(activityId, "محمد ولد أحمد");
  await signInAsUser(captain.userId);
  await CREATE_TEAM(post("/api/teams", { activityId, name: "الصقور" }));
  const team = await prisma.team.findFirstOrThrow({ where: { activityId, name: "الصقور" } });
  return { captain, team };
}

const started = (activityId: string) =>
  prisma.activity.update({ where: { id: activityId }, data: { startsAt: PAST } });

const seat = (teamId: string, userId: string) =>
  prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });

describe("what the admin sees behind a team it did not arrange", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries the direction of every waiting row", async () => {
    const activity = await aTournament();
    const { captain, team } = await aTeamBuiltByAPlayer(activity.id);
    const invited = await registrant(activity.id, "أحمد");
    const asker = await registrant(activity.id, "سالم");
    await signInAsUser(captain.userId);
    await INVITE(
      post(`/api/teams/${team.id}/invites`, { userId: invited.userId }),
      withParams({ teamId: team.id }),
    );
    await signInAsUser(asker.userId);
    await JOIN(
      post(`/api/teams/${team.id}/join`, { userId: asker.userId }),
      withParams({ teamId: team.id }),
    );
    await signInAsAdmin(await createAdmin());

    const body = await (
      await ADMIN_TEAMS(get(`/api/admin/activities/${activity.id}/teams`), withId(activity.id))
    ).json();
    const rows = body.teams[0].members as {
      userId: string;
      status: string;
      invitedByCaptain: boolean;
    }[];

    expect(rows.find((r) => r.userId === invited.userId)).toMatchObject({
      status: "PENDING",
      invitedByCaptain: true,
    });
    expect(rows.find((r) => r.userId === asker.userId)).toMatchObject({
      status: "PENDING",
      invitedByCaptain: false,
    });
    expect(rows.find((r) => r.userId === captain.userId)).toMatchObject({ status: "ACTIVE" });
  });

  it("still counts a registrant holding an unanswered invitation as being on no team", async () => {
    const activity = await aTournament();
    const { captain, team } = await aTeamBuiltByAPlayer(activity.id);
    const invited = await registrant(activity.id, "أحمد");
    await signInAsUser(captain.userId);
    await INVITE(
      post(`/api/teams/${team.id}/invites`, { userId: invited.userId }),
      withParams({ teamId: team.id }),
    );
    await signInAsAdmin(await createAdmin());

    const body = await (
      await ADMIN_ROSTER(get(`/api/admin/activities/${activity.id}/roster`), withId(activity.id))
    ).json();
    const row = body.roster.find((r: { id: string }) => r.id === invited.userId);

    expect(row.team).toBeNull();
  });
});

describe("what the admin can still do after the tournament has started", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("adds a player to a team the players built", async () => {
    const activity = await aTournament();
    const { team } = await aTeamBuiltByAPlayer(activity.id);
    const outsider = await registrant(activity.id, "أحمد");
    await started(activity.id);
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_ADD(
      post(`/api/admin/teams/${team.id}/members`, { userId: outsider.userId }),
      withParams({ teamId: team.id }),
    );

    expect(res.status).toBe(201);
    expect(await seat(team.id, outsider.userId)).toMatchObject({ status: "ACTIVE" });
  });

  it("removes a player from a team the players built", async () => {
    const activity = await aTournament();
    const { captain, team } = await aTeamBuiltByAPlayer(activity.id);
    await started(activity.id);
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_REMOVE(del(`/api/admin/teams/${team.id}/members/${captain.userId}`), {
      params: Promise.resolve({ teamId: team.id, memberId: captain.userId }),
    });

    expect(res.status).toBe(200);
    expect(await seat(team.id, captain.userId)).toBeNull();
  });

  it("renames the team and moves the captaincy", async () => {
    const activity = await aTournament();
    const { captain, team } = await aTeamBuiltByAPlayer(activity.id);
    await started(activity.id);
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_TEAM(
      patch(`/api/admin/teams/${team.id}`, { name: "النسور", captainUserId: captain.userId }),
      withParams({ teamId: team.id }),
    );

    expect(res.status).toBe(200);
    expect(await prisma.team.findUniqueOrThrow({ where: { id: team.id } })).toMatchObject({
      name: "النسور",
      captainUserId: captain.userId,
    });
  });

  it("deletes the team", async () => {
    const activity = await aTournament();
    const { team } = await aTeamBuiltByAPlayer(activity.id);
    await started(activity.id);
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_DELETE_TEAM(del(`/api/admin/teams/${team.id}`), {
      params: Promise.resolve({ teamId: team.id }),
    });

    expect(res.status).toBe(200);
    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(0);
  });

  it("adds a player who was holding an unanswered invitation from another team", async () => {
    const activity = await aTournament();
    const first = await aTeamBuiltByAPlayer(activity.id);
    const other = await prisma.team.create({
      data: { activityId: activity.id, name: "النسور" },
    });
    const invited = await registrant(activity.id, "أحمد");
    await signInAsUser(first.captain.userId);
    await INVITE(
      post(`/api/teams/${first.team.id}/invites`, { userId: invited.userId }),
      withParams({ teamId: first.team.id }),
    );
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_ADD(
      post(`/api/admin/teams/${other.id}/members`, { userId: invited.userId }),
      withParams({ teamId: other.id }),
    );

    expect(res.status).toBe(201);
    expect(await seat(other.id, invited.userId)).toMatchObject({ status: "ACTIVE" });
    expect(await seat(first.team.id, invited.userId)).toBeNull();
  });

  it("is not told a team is full by invitations nobody has answered", async () => {
    const activity = await aTournament({ minTeamSize: 2, maxTeamSize: 2 });
    const { captain, team } = await aTeamBuiltByAPlayer(activity.id);
    const invited = await registrant(activity.id, "أحمد");
    const wanted = await registrant(activity.id, "سالم");
    await signInAsUser(captain.userId);
    await INVITE(
      post(`/api/teams/${team.id}/invites`, { userId: invited.userId }),
      withParams({ teamId: team.id }),
    );
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_ADD(
      post(`/api/admin/teams/${team.id}/members`, { userId: wanted.userId }),
      withParams({ teamId: team.id }),
    );

    expect(res.status).toBe(201);
  });
});
