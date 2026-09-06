import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, del, createAdmin, signInAs, signInAsAdmin, makeMember } from "./helpers";
import { entrantWording } from "@/lib/messages";

import { PATCH as SET_TEAM } from "@/app/api/admin/teams/[teamId]/route";
import { DELETE as REMOVE_MEMBER } from "@/app/api/admin/teams/[teamId]/members/[memberId]/route";
import { DELETE as LEAVE } from "@/app/api/teams/[teamId]/join/route";

const withTeam = (teamId: string) => ({ params: Promise.resolve({ teamId }) });
const withMember = (teamId: string, memberId: string) => ({
  params: Promise.resolve({ teamId, memberId }),
});

async function squad() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true },
  });
  const team = await prisma.team.create({ data: { activityId: activity.id, name: "فريق النجم" } });
  const other = await prisma.team.create({
    data: { activityId: activity.id, name: "فريق الوحدة" },
  });

  const players = [];
  for (let i = 0; i < 3; i++) {
    const member = await makeMember({
      fullName: `لاعب ${i}`,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.teamMember.create({
      data: { teamId: i === 2 ? other.id : team.id, userId: member.userId, status: "ACTIVE" },
    });
    await prisma.activityRegistration.create({
      data: { userId: member.userId, activityId: activity.id, status: "ACTIVE" },
    });
    players.push(member);
  }

  return { activity, team, other, players };
}

const setCaptain = (teamId: string, captainUserId: string | null) =>
  SET_TEAM(patch(`/api/admin/teams/${teamId}`, { captainUserId }), withTeam(teamId));

async function captainOf(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  return team?.captainUserId ?? null;
}

describe("the team captain", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes a player who is on the roster", async () => {
    const { team, players } = await squad();

    const res = await setCaptain(team.id, players[0].userId);

    expect(res.status).toBe(200);
    expect(await captainOf(team.id)).toBe(players[0].userId);
  });

  it("refuses a player from another team", async () => {
    const { team, players } = await squad();

    const res = await setCaptain(team.id, players[2].userId);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(entrantWording("team").captainNotInEntrant);
    expect(await captainOf(team.id)).toBeNull();
  });

  it("refuses somebody who plays in no team at all", async () => {
    const { team } = await squad();
    const stranger = await makeMember({
      fullName: "غريب",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });

    const res = await setCaptain(team.id, stranger.userId);

    expect(res.status).toBe(400);
    expect(await captainOf(team.id)).toBeNull();
  });

  it("clears on request", async () => {
    const { team, players } = await squad();
    await setCaptain(team.id, players[0].userId);

    const res = await setCaptain(team.id, null);

    expect(res.status).toBe(200);
    expect(await captainOf(team.id)).toBeNull();
  });

  it("leaves the rest of the team alone when it changes", async () => {
    const { team, players } = await squad();
    await setCaptain(team.id, players[0].userId);

    await setCaptain(team.id, players[1].userId);

    expect(await captainOf(team.id)).toBe(players[1].userId);
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(2);
  });

  it("clears when an admin takes the captain off the team", async () => {
    const { team, players } = await squad();
    await setCaptain(team.id, players[0].userId);

    const res = await REMOVE_MEMBER(
      del(`/api/admin/teams/${team.id}/members/${players[0].userId}`),
      withMember(team.id, players[0].userId),
    );

    expect(res.status).toBe(200);
    expect(await captainOf(team.id)).toBeNull();
  });

  it("keeps the captain when another player is taken off the team", async () => {
    const { team, players } = await squad();
    await setCaptain(team.id, players[0].userId);

    await REMOVE_MEMBER(
      del(`/api/admin/teams/${team.id}/members/${players[1].userId}`),
      withMember(team.id, players[1].userId),
    );

    expect(await captainOf(team.id)).toBe(players[0].userId);
  });

  it("clears when the captain withdraws a join request", async () => {
    const { activity, team } = await squad();
    const joiner = await makeMember({
      fullName: "منضم",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.activityRegistration.create({
      data: { userId: joiner.userId, activityId: activity.id, status: "ACTIVE" },
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: joiner.userId, status: "PENDING" },
    });
    await setCaptain(team.id, joiner.userId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: joiner.userId } });
    await signInAs(user);
    const res = await LEAVE(
      del(`/api/teams/${team.id}/join`, { userId: joiner.userId }),
      withTeam(team.id),
    );

    expect(res.status).toBe(200);
    expect(await captainOf(team.id)).toBeNull();
  });

  it("goes with the team when the team goes", async () => {
    const { team, players } = await squad();
    await setCaptain(team.id, players[0].userId);

    await prisma.team.delete({ where: { id: team.id } });

    expect(await prisma.user.count({ where: { id: players[0].userId } })).toBe(1);
  });
});
