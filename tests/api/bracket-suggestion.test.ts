import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, signInAsAdmin, withId } from "./helpers";
import {
  GET as SUGGEST,
  POST as VALIDATE,
} from "@/app/api/admin/activities/[id]/bracket/suggestion/route";

async function tournament(groupCount: number, perGroup = 4) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
    },
  });
  const groups = [];
  for (let g = 0; g < groupCount; g++) {
    const group = await prisma.group.create({
      data: { activityId: activity.id, name: `المجموعة ${g + 1}` },
    });
    const teams = [];
    for (let t = 0; t < perGroup; t++) {
      teams.push(
        await prisma.team.create({
          data: { activityId: activity.id, name: `م${g + 1}ف${t + 1}`, groupId: group.id },
        }),
      );
    }
    groups.push({ group, teams });
  }
  return { activity, groups };
}

async function playGroups(activityId: string, groups: { teams: { id: string }[] }[]) {
  let order = 1;
  for (const { teams } of groups) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        await prisma.match.create({
          data: {
            activityId,
            homeTeamId: teams[i].id,
            awayTeamId: teams[j].id,
            homeScore: teams.length - i,
            awayScore: 0,
            status: "PLAYED",
            order: order++,
          },
        });
      }
    }
  }
}

const suggest = (id: string) =>
  SUGGEST(get(`/api/admin/activities/${id}/bracket/suggestion`), withId(id));

const validate = (id: string, body: object = {}) =>
  VALIDATE(post(`/api/admin/activities/${id}/bracket/suggestion`, body), withId(id));

describe("suggesting the knockout bracket", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("proposes a semi final for two groups without writing anything", async () => {
    const { activity, groups } = await tournament(2);
    await playGroups(activity.id, groups);

    const body = await (await suggest(activity.id)).json();

    expect(body.pairs).toHaveLength(2);
    expect(body.label).toBe("نصف النهائي");
    expect(body.groupStageComplete).toBe(true);
    expect(await prisma.match.count({ where: { activityId: activity.id, isKnockout: true } })).toBe(
      0,
    );
  });

  it("proposes a quarter final for four groups", async () => {
    const { activity, groups } = await tournament(4);
    await playGroups(activity.id, groups);

    const body = await (await suggest(activity.id)).json();

    expect(body.pairs).toHaveLength(4);
    expect(body.label).toBe("ربع النهائي");
  });

  it("faces every group winner with another group's runner up", async () => {
    const { activity, groups } = await tournament(4);
    await playGroups(activity.id, groups);

    const { pairs } = await (await suggest(activity.id)).json();

    for (const pair of pairs) {
      expect(pair.home.position).toBe(1);
      expect(pair.away.position).toBe(2);
      expect(pair.home.groupId).not.toBe(pair.away.groupId);
    }
  });

  it("refuses a group count that cannot fill a bracket", async () => {
    const { activity, groups } = await tournament(3);
    await playGroups(activity.id, groups);

    const body = await (await suggest(activity.id)).json();
    expect(body.problem).toBe("groupCount");
    expect(body.pairs).toEqual([]);

    expect((await validate(activity.id)).status).toBe(400);
  });

  it("says the group stage is still open, and refuses to write", async () => {
    const { activity, groups } = await tournament(2);
    await playGroups(activity.id, groups);
    await prisma.match.updateMany({
      where: { activityId: activity.id },
      data: { status: "SCHEDULED" },
    });

    expect((await (await suggest(activity.id)).json()).groupStageComplete).toBe(false);
    expect((await validate(activity.id)).status).toBe(409);
  });

  it("warns when a qualifying place is a tie nothing can settle", async () => {
    const { activity, groups } = await tournament(2, 2);
    let order = 1;
    for (const { teams } of groups) {
      await prisma.match.create({
        data: {
          activityId: activity.id,
          homeTeamId: teams[0].id,
          awayTeamId: teams[1].id,
          homeScore: 0,
          awayScore: 0,
          status: "PLAYED",
          order: order++,
        },
      });
    }

    expect((await (await suggest(activity.id)).json()).problem).toBe("unresolvedTie");
  });

  it("writes the round the admin validated, in bracket order", async () => {
    const { activity, groups } = await tournament(4);
    await playGroups(activity.id, groups);
    const { pairs } = await (await suggest(activity.id)).json();

    const res = await validate(activity.id);

    expect(res.status).toBe(200);
    const created = await prisma.match.findMany({
      where: { activityId: activity.id, isKnockout: true },
      orderBy: { order: "asc" },
    });
    expect(created).toHaveLength(4);
    expect(created.every((m) => m.bracketRound === 1)).toBe(true);
    expect(created.map((m) => m.homeTeamId)).toEqual(
      pairs.map((p: { home: { teamId: string } }) => p.home.teamId),
    );
  });

  it("keeps the two teams from one group in opposite halves", async () => {
    const { activity, groups } = await tournament(4);
    await playGroups(activity.id, groups);
    await validate(activity.id);

    const created = await prisma.match.findMany({
      where: { activityId: activity.id, isKnockout: true },
      orderBy: { order: "asc" },
    });
    const half = (teamId: string) => {
      const i = created.findIndex((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
      return Math.floor(i / 2);
    };
    for (const { teams } of groups) {
      const standingsTop = teams[0].id;
      const standingsSecond = teams[1].id;
      expect(half(standingsTop)).not.toBe(half(standingsSecond));
    }
  });

  it("refuses to write over a bracket unless asked to redo it", async () => {
    const { activity, groups } = await tournament(2);
    await playGroups(activity.id, groups);
    await validate(activity.id);

    expect((await validate(activity.id)).status).toBe(409);
    expect((await validate(activity.id, { redo: true })).status).toBe(200);
    expect(await prisma.match.count({ where: { activityId: activity.id, isKnockout: true } })).toBe(
      2,
    );
  });

  it("is closed to nobody at all", async () => {
    const { activity } = await tournament(2);
    const { clearCookies } = await import("./cookieJar");
    clearCookies();

    expect((await suggest(activity.id)).status).toBe(401);
    expect((await validate(activity.id)).status).toBe(401);
  });
});
