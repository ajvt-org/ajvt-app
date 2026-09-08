import { describe, it, expect, beforeEach } from "vitest";
import { GET as MY_TEAM, POST as CREATE_TEAM } from "@/app/api/teams/route";
import { POST as JOIN } from "@/app/api/teams/[teamId]/join/route";
import { prisma } from "@/lib/prisma";
import { tournament as messages } from "@/lib/messages";
import { resetDb, post, get, signInAs, withParams, makeMember } from "./helpers";

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

async function registrantOf(activityId: string, fullName: string) {
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

async function signedInRegistrant(activityId: string, fullName: string) {
  const member = await registrantOf(activityId, fullName);
  await signInAs(await prisma.user.findUniqueOrThrow({ where: { id: member.userId } }));
  return member;
}

const create = (activityId: string, name: string) =>
  CREATE_TEAM(post("/api/teams", { activityId, name }));

const mine = (activityId: string) => MY_TEAM(get(`/api/teams?activityId=${activityId}`));

describe("a registrant building their own team", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates it, is in it, and captains it", async () => {
    const activity = await aTournament();
    const member = await signedInRegistrant(activity.id, "محمد ولد أحمد");

    const res = await create(activity.id, "الصقور");

    expect(res.status).toBe(201);
    const team = await prisma.team.findFirstOrThrow({ where: { activityId: activity.id } });
    expect(team).toMatchObject({ name: "الصقور", autoNamed: false, captainUserId: member.userId });
    expect(
      await prisma.teamMember.findUniqueOrThrow({
        where: { teamId_userId: { teamId: team.id, userId: member.userId } },
      }),
    ).toMatchObject({ status: "ACTIVE" });
  });

  it("gives a registrant no second team", async () => {
    const activity = await aTournament();
    await signedInRegistrant(activity.id, "محمد ولد أحمد");
    await create(activity.id, "الصقور");

    const res = await create(activity.id, "النسور");

    expect(res.status).toBe(409);
    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(1);
  });

  it("gives no team to a registrant who is already asking to join one", async () => {
    const activity = await aTournament();
    await signedInRegistrant(activity.id, "أحمد ولد سالم");
    const first = (await (await create(activity.id, "الصقور")).json()).team;

    const asker = await signedInRegistrant(activity.id, "محمد ولد أحمد");
    await JOIN(
      post(`/api/teams/${first.id}/join`, { userId: asker.userId }),
      withParams({ teamId: first.id }),
    );

    const res = await create(activity.id, "النسور");

    expect(res.status).toBe(409);
    expect(await prisma.team.count({ where: { activityId: activity.id } })).toBe(1);
  });

  it("refuses a team with no name", async () => {
    const activity = await aTournament();
    await signedInRegistrant(activity.id, "محمد ولد أحمد");

    const res = await create(activity.id, "   ");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: messages.teamNameRequired });
  });

  it("refuses a name past forty characters", async () => {
    const activity = await aTournament();
    await signedInRegistrant(activity.id, "محمد ولد أحمد");

    const res = await create(activity.id, "ا".repeat(41));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: messages.teamNameTooLong });
  });

  it("refuses on a tournament the admin arranges", async () => {
    const activity = await aTournament({ playersBuildTeams: false });
    await signedInRegistrant(activity.id, "محمد ولد أحمد");

    const res = await create(activity.id, "الصقور");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: messages.teamsArrangedByAdmin });
  });

  it("refuses a registrant whose registration is not approved", async () => {
    const activity = await aTournament();
    const member = await makeMember({
      fullName: "سالم ولد محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.activityRegistration.create({
      data: { userId: member.userId, activityId: activity.id, status: "PENDING" },
    });
    await signInAs(await prisma.user.findUniqueOrThrow({ where: { id: member.userId } }));

    expect((await create(activity.id, "الصقور")).status).toBe(403);
    expect(await prisma.team.count()).toBe(0);
  });
});

describe("what a registrant is told about their team", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries the squad the tournament sets and no team before one is built", async () => {
    const activity = await aTournament();
    await signedInRegistrant(activity.id, "محمد ولد أحمد");

    const body = await (await mine(activity.id)).json();

    expect(body).toEqual({
      locked: false,
      team: null,
      request: null,
      invitations: [],
      candidates: [],
      squad: { min: 2, max: 3 },
    });
  });

  it("carries the team and its roster once it is built", async () => {
    const activity = await aTournament();
    const member = await signedInRegistrant(activity.id, "محمد ولد أحمد");
    await create(activity.id, "الصقور");

    const body = await (await mine(activity.id)).json();

    expect(body.team).toMatchObject({ name: "الصقور", captainUserId: member.userId });
    expect(body.team.members).toEqual([
      { userId: member.userId, fullName: "محمد ولد أحمد", photo: null, kind: "member" },
    ]);
  });
});
