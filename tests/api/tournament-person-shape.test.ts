import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as TEAMS } from "@/app/api/admin/activities/[id]/teams/route";
import { GET as MATCHES } from "@/app/api/admin/activities/[id]/matches/route";
import {
  resetDb,
  get,
  createAdmin,
  createUsers,
  signInAsAdmin,
  makeMember,
  withId,
} from "./helpers";

async function aTournament() {
  return prisma.activity.create({
    data: { title: "بطولة الناشئين", description: "بطولة", isTournament: true, isOpen: true },
  });
}

async function aPlayer(name: string) {
  const [user] = await createUsers(1);
  const member = await makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
  return member;
}

async function aTeamWith(activityId: string, name: string, playerName: string) {
  const team = await prisma.team.create({ data: { activityId, name } });
  const member = await aPlayer(playerName);
  await prisma.teamMember.create({
    data: { teamId: team.id, memberId: member.id, userId: member.userId, status: "ACTIVE" },
  });
  return { team, member };
}

describe("the person on the tournament admin payloads", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("names a team member flat, the way the workspace reads it", async () => {
    const activity = await aTournament();
    await aTeamWith(activity.id, "الشناقطة", "محمد ولد أحمد");

    const body = await (
      await TEAMS(get(`/api/admin/activities/${activity.id}/teams`), withId(activity.id))
    ).json();
    const player = body.teams[0].members[0].member;

    expect(player.fullName).toBe("محمد ولد أحمد");
    expect(player).not.toHaveProperty("user");
  });

  it("names a scorer flat on a match", async () => {
    const activity = await aTournament();
    const home = await aTeamWith(activity.id, "الشناقطة", "محمد ولد أحمد");
    const away = await aTeamWith(activity.id, "العدالة", "أحمد سالم");
    const match = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        status: "PLAYED",
        homeScore: 1,
        awayScore: 0,
      },
    });
    await prisma.matchGoal.create({
      data: {
        matchId: match.id,
        memberId: home.member.id,
        userId: home.member.userId,
        teamId: home.team.id,
        count: 1,
        minute: 10,
      },
    });

    const body = await (
      await MATCHES(get(`/api/admin/activities/${activity.id}/matches`), withId(activity.id))
    ).json();
    const scorer = body.matches[0].goals[0].member;

    expect(scorer.fullName).toBe("محمد ولد أحمد");
    expect(scorer).not.toHaveProperty("user");
  });

  it("names the man of the match flat", async () => {
    const activity = await aTournament();
    const home = await aTeamWith(activity.id, "الشناقطة", "محمد ولد أحمد");
    const away = await aTeamWith(activity.id, "العدالة", "أحمد سالم");
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        status: "PLAYED",
        homeScore: 1,
        awayScore: 0,
        manOfTheMatchId: home.member.id,
        manOfTheMatchUserId: home.member.userId,
      },
    });

    const body = await (
      await MATCHES(get(`/api/admin/activities/${activity.id}/matches`), withId(activity.id))
    ).json();

    expect(body.matches[0].manOfTheMatch.fullName).toBe("محمد ولد أحمد");
  });

  it("leaves a goal with no scorer alone", async () => {
    const activity = await aTournament();
    const home = await aTeamWith(activity.id, "الشناقطة", "محمد ولد أحمد");
    const away = await aTeamWith(activity.id, "العدالة", "أحمد سالم");
    const match = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        status: "PLAYED",
        homeScore: 1,
        awayScore: 0,
      },
    });
    await prisma.matchGoal.create({
      data: { matchId: match.id, teamId: home.team.id, count: 1, minute: null },
    });

    const body = await (
      await MATCHES(get(`/api/admin/activities/${activity.id}/matches`), withId(activity.id))
    ).json();

    expect(body.matches[0].goals[0].member).toBeNull();
  });
});
