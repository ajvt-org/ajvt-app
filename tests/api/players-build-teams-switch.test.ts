import { describe, it, expect, beforeEach } from "vitest";
import { POST as JOIN, DELETE as LEAVE } from "@/app/api/teams/[teamId]/join/route";
import { PATCH as UPDATE_ACTIVITY } from "@/app/api/admin/activities/[id]/route";
import { prisma } from "@/lib/prisma";
import { tournament as messages } from "@/lib/messages";
import {
  resetDb,
  post,
  del,
  patch,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  withParams,
  makeMember,
} from "./helpers";

async function tournamentTeam(playersBuildTeams: boolean, over: Record<string, unknown> = {}) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة الحي",
      description: "بطولة فرق",
      isTournament: true,
      isOpen: true,
      playersBuildTeams,
      ...over,
    },
  });
  const team = await prisma.team.create({ data: { activityId: activity.id, name: "الصقور" } });
  return { activity, team };
}

async function playerOn(activityId: string, fullName = "محمد ولد أحمد") {
  const member = await makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
  await prisma.activityRegistration.create({
    data: { userId: member.userId, activityId, status: "ACTIVE" },
  });
  const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
  await signInAs(account);
  return member;
}

const join = (teamId: string, userId: string) =>
  JOIN(post(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));

const leave = (teamId: string, userId: string) =>
  LEAVE(del(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));

describe("the switch that says who builds the teams", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lets a registrant ask to join once the tournament turns it on", async () => {
    const { activity, team } = await tournamentTeam(true);
    const member = await playerOn(activity.id);

    expect((await join(team.id, member.userId)).status).toBe(200);
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(1);
  });

  it("refuses the join on a tournament the admin arranges", async () => {
    const { activity, team } = await tournamentTeam(false);
    const member = await playerOn(activity.id);

    const res = await join(team.id, member.userId);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: messages.teamsArrangedByAdmin });
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("refuses the join on a singles tournament even with the switch on", async () => {
    const { activity, team } = await tournamentTeam(true, { minTeamSize: 1, maxTeamSize: 1 });
    const member = await playerOn(activity.id);

    expect((await join(team.id, member.userId)).status).toBe(403);
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("still cancels a request that was made before the switch went off", async () => {
    const { activity, team } = await tournamentTeam(true);
    const member = await playerOn(activity.id);
    await join(team.id, member.userId);
    await prisma.activity.update({
      where: { id: activity.id },
      data: { playersBuildTeams: false },
    });

    expect((await leave(team.id, member.userId)).status).toBe(200);
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("saves the switch from the tournament settings", async () => {
    const { activity } = await tournamentTeam(false);
    await signInAsAdmin(await createAdmin());

    const res = await UPDATE_ACTIVITY(
      patch(`/api/admin/activities/${activity.id}`, { playersBuildTeams: true }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect(
      (await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } })).playersBuildTeams,
    ).toBe(true);
  });
});
