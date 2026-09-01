import { describe, it, expect, beforeEach } from "vitest";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";
import { POST as NEXT_ROUND } from "@/app/api/admin/activities/[id]/bracket/next-round/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";

async function knockoutActivity(teamNames: string[], groupNames: string[] = []) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة القرعة", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
  });
  const groups = [];
  for (const name of groupNames) {
    groups.push(await prisma.group.create({ data: { activityId: activity.id, name } }));
  }
  const teams = [];
  for (const [i, name] of teamNames.entries()) {
    teams.push(
      await prisma.team.create({
        data: {
          activityId: activity.id,
          name,
          groupId: groups.length > 0 ? groups[i % groups.length].id : null,
        },
      }),
    );
  }
  return { activity, teams, groups };
}

const draw = (id: string, body: object = {}) =>
  DRAW(post(`/api/admin/activities/${id}/bracket/draw`, body), withId(id));

describe("the knockout draw", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("draws a first round without pairing two teams of one group", async () => {
    const { activity, teams } = await knockoutActivity(
      ["أ1", "ب1", "أ2", "ب2"],
      ["المجموعة أ", "المجموعة ب"],
    );
    for (const [home, away] of [
      [teams[0], teams[2]],
      [teams[1], teams[3]],
    ]) {
      await prisma.match.create({
        data: {
          activityId: activity.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          status: "PLAYED",
          homeScore: 1,
          awayScore: 0,
        },
      });
    }

    const res = await draw(activity.id);

    expect(res.status).toBe(200);
    const matches = await prisma.match.findMany({
      where: { activityId: activity.id, bracketRound: 1 },
      include: { homeTeam: true, awayTeam: true },
    });
    expect(matches).toHaveLength(2);
    for (const m of matches) {
      expect(m.homeTeam?.groupId).not.toBe(m.awayTeam?.groupId);
    }
  });

  it("refuses a second draw unless it is a redo", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await draw(activity.id);

    expect((await draw(activity.id)).status).toBe(409);
    expect((await draw(activity.id, { redo: true })).status).toBe(200);
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(2);
  });

  it("keeps a bracket with a recorded result", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await draw(activity.id);
    const match = await prisma.match.findFirstOrThrow({ where: { activityId: activity.id } });
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "PLAYED", homeScore: 1, awayScore: 0 },
    });

    const res = await draw(activity.id, { redo: true });

    expect(res.status).toBe(409);
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(2);
  });

  it("advances the winners into the next round", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await draw(activity.id);
    for (const m of await prisma.match.findMany({ where: { activityId: activity.id } })) {
      await prisma.match.update({
        where: { id: m.id },
        data: { status: "PLAYED", homeScore: 2, awayScore: 0 },
      });
    }

    const res = await NEXT_ROUND(
      post(`/api/admin/activities/${activity.id}/bracket/next-round`, {}),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    const final = await prisma.match.findFirstOrThrow({
      where: { activityId: activity.id, bracketRound: 2 },
    });
    expect(final.isKnockout).toBe(true);
  });
});
