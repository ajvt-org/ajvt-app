import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_ACTIVITY } from "@/app/api/admin/activities/route";
import { POST as CREATE_TEAM } from "@/app/api/admin/activities/[id]/teams/route";
import { POST as ADD_MEMBER } from "@/app/api/admin/teams/[teamId]/members/route";
import { POST as JOIN, DELETE as LEAVE } from "@/app/api/teams/[teamId]/join/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  del,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withParams,
  makeMember,
} from "./helpers";

async function tournament() {
  const res = await CREATE_ACTIVITY(
    post("/api/admin/activities", {
      title: "بطولة الحي",
      description: "بطولة فرق",
      isTournament: true,
      format: "KNOCKOUT",
      minTeamSize: null,
      maxTeamSize: null,
    }),
  );
  return (await res.json()).activity;
}

async function team(activityId: string, name: string) {
  const res = await CREATE_TEAM(post(`/api/admin/activities/${activityId}/teams`, { name }), {
    params: Promise.resolve({ id: activityId }),
  });
  return (await res.json()).team;
}

async function player(activityId: string, fullName: string) {
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

const addPlayer = (teamId: string, body: unknown) =>
  ADD_MEMBER(post(`/api/admin/teams/${teamId}/members`, body), withParams({ teamId }));

const join = (teamId: string, body: unknown) =>
  JOIN(post(`/api/teams/${teamId}/join`, body), withParams({ teamId }));

const leave = (teamId: string, body: unknown) =>
  LEAVE(del(`/api/teams/${teamId}/join`, body), withParams({ teamId }));

describe("the team routes name the account userId", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("adds a player sent as userId", async () => {
    const activity = await tournament();
    const side = await team(activity.id, "النجم");
    const member = await player(activity.id, "أحمد ولد سالم");

    const res = await addPlayer(side.id, { userId: member.userId });

    expect(res.status).toBe(201);
    expect(await prisma.teamMember.count({ where: { teamId: side.id } })).toBe(1);
  });

  it("refuses a player sent as memberId", async () => {
    const activity = await tournament();
    const side = await team(activity.id, "النجم");
    const member = await player(activity.id, "أحمد ولد سالم");

    const res = await addPlayer(side.id, { memberId: member.userId });

    expect(res.status).toBe(400);
    expect(await prisma.teamMember.count({ where: { teamId: side.id } })).toBe(0);
  });

  it("lets a member join with userId and leave the same way", async () => {
    const activity = await tournament();
    const side = await team(activity.id, "الوفاق");
    const member = await player(activity.id, "محمد ولد أحمد");
    const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    await signInAs(account);

    expect((await join(side.id, { userId: member.userId })).status).toBe(200);
    expect(await prisma.teamMember.count({ where: { teamId: side.id } })).toBe(1);

    expect((await leave(side.id, { userId: member.userId })).status).toBe(200);
    expect(await prisma.teamMember.count({ where: { teamId: side.id } })).toBe(0);
  });

  it("refuses a join sent as memberId", async () => {
    const activity = await tournament();
    const side = await team(activity.id, "الوفاق");
    const member = await player(activity.id, "محمد ولد أحمد");
    const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    await signInAs(account);

    const res = await join(side.id, { memberId: member.userId });

    expect(res.status).toBe(400);
    expect(await prisma.teamMember.count({ where: { teamId: side.id } })).toBe(0);
  });
});
