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

  it("fills an odd field with byes so the first round is a full bracket", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د", "ه"]);

    const res = await draw(activity.id);

    expect(res.status).toBe(200);
    const matches = await prisma.match.findMany({
      where: { activityId: activity.id, bracketRound: 1 },
    });
    expect(matches).toHaveLength(4);
    expect(matches.filter((m) => m.awayTeamId === null)).toHaveLength(3);
    expect(
      new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId].filter(Boolean))),
    ).toHaveProperty("size", 5);
  });

  it("carries a bye straight into the next round", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج"]);
    await draw(activity.id);
    const contest = await prisma.match.findFirstOrThrow({
      where: { activityId: activity.id, awayTeamId: { not: null } },
    });
    await prisma.match.update({
      where: { id: contest.id },
      data: { status: "PLAYED", homeScore: 2, awayScore: 1 },
    });

    const res = await NEXT_ROUND(
      post(`/api/admin/activities/${activity.id}/bracket/next-round`, {}),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    const final = await prisma.match.findFirstOrThrow({
      where: { activityId: activity.id, bracketRound: 2 },
    });
    const bye = await prisma.match.findFirstOrThrow({
      where: { activityId: activity.id, bracketRound: 1, awayTeamId: null },
    });
    expect([final.homeTeamId, final.awayTeamId]).toContain(contest.homeTeamId);
    expect([final.homeTeamId, final.awayTeamId]).toContain(bye.homeTeamId);
  });

  it("lets a bracket that has only byes be redrawn", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج"]);
    await draw(activity.id);

    expect((await draw(activity.id, { redo: true })).status).toBe(200);
  });

  it("says why the groups make a draw impossible rather than pairing them anyway", async () => {
    const { activity, teams } = await knockoutActivity(["أ1", "أ2", "أ3", "أ4"], ["المجموعة أ"]);
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        status: "PLAYED",
        homeScore: 1,
        awayScore: 0,
      },
    });

    const res = await draw(activity.id);

    expect(res.status).toBe(400);
    expect(await prisma.match.count({ where: { activityId: activity.id, isKnockout: true } })).toBe(
      0,
    );
  });

  it("refuses a field of one", async () => {
    const { activity } = await knockoutActivity(["أ"]);

    expect((await draw(activity.id)).status).toBe(400);
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

async function bracketOfPlaceholders(activityId: string, firstRoundSize: number) {
  let order = 100;
  let size = firstRoundSize;
  let round = 1;
  const day = new Date("2026-09-20T16:00:00.000Z");
  while (size >= 1) {
    for (let i = 0; i < size; i++) {
      await prisma.match.create({
        data: {
          activityId,
          isKnockout: true,
          bracketRound: round,
          order: order++,
          matchDate: new Date(day.getTime() + round * 86_400_000),
        },
      });
    }
    size /= 2;
    round++;
  }
}

const bracket = (activityId: string) =>
  prisma.match.findMany({
    where: { activityId, bracketRound: { not: null } },
    orderBy: [{ bracketRound: "asc" }, { order: "asc" }],
  });

describe("a bracket laid out before the teams are known", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("fills the waiting fixtures rather than creating new ones", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    const before = await bracket(activity.id);

    const res = await draw(activity.id);

    expect(res.status).toBe(200);
    const after = await bracket(activity.id);
    expect(after.map((m) => m.id)).toEqual(before.map((m) => m.id));
    expect(after.filter((m) => m.bracketRound === 1).every((m) => m.homeTeamId !== null)).toBe(
      true,
    );
  });

  it("keeps the day and the kick off it was given", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    const before = await bracket(activity.id);

    await draw(activity.id);

    const after = await bracket(activity.id);
    expect(after.map((m) => m.matchDate?.toISOString())).toEqual(
      before.map((m) => m.matchDate?.toISOString()),
    );
  });

  it("leaves the later rounds waiting", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);

    await draw(activity.id);

    const final = (await bracket(activity.id)).filter((m) => m.bracketRound === 2);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({ homeTeamId: null, awayTeamId: null });
  });

  it("takes a redo without losing the schedule", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    await draw(activity.id);
    const before = await bracket(activity.id);

    const res = await draw(activity.id, { redo: true });

    expect(res.status).toBe(200);
    const after = await bracket(activity.id);
    expect(after.map((m) => m.id)).toEqual(before.map((m) => m.id));
    expect(after.map((m) => m.matchDate?.toISOString())).toEqual(
      before.map((m) => m.matchDate?.toISOString()),
    );
  });

  it("refuses a draw the scheduled first round cannot hold", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 4);

    const res = await draw(activity.id);

    expect(res.status).toBe(409);
  });

  it("leaves every round and every kick off alone when it refuses", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 4);
    const before = await bracket(activity.id);

    await draw(activity.id);

    const after = await bracket(activity.id);
    expect(after.map((m) => m.id)).toEqual(before.map((m) => m.id));
    expect(after.map((m) => m.bracketRound)).toEqual([1, 1, 1, 1, 2, 2, 3]);
    expect(after.map((m) => m.matchDate?.toISOString())).toEqual(
      before.map((m) => m.matchDate?.toISOString()),
    );
    expect(after.every((m) => m.homeTeamId === null && m.awayTeamId === null)).toBe(true);
  });

  it("creates the first round when no bracket is scheduled at all", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);

    const res = await draw(activity.id);

    expect(res.status).toBe(200);
    const after = await bracket(activity.id);
    expect(after).toHaveLength(2);
    expect(after.every((m) => m.bracketRound === 1 && m.homeTeamId !== null)).toBe(true);
  });

  it("refuses a second draw that is not a redo", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    await draw(activity.id);

    expect((await draw(activity.id)).status).toBe(409);
  });

  it("advances the winners into the waiting final", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    await draw(activity.id);
    const first = (await bracket(activity.id)).filter((m) => m.bracketRound === 1);
    for (const m of first) {
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
    const final = (await bracket(activity.id)).filter((m) => m.bracketRound === 2);
    expect(final).toHaveLength(1);
    expect(final[0].homeTeamId).toBe(first[0].homeTeamId);
    expect(final[0].awayTeamId).toBe(first[1].homeTeamId);
  });

  it("refuses to advance twice into the same round", async () => {
    const { activity } = await knockoutActivity(["أ", "ب", "ج", "د"]);
    await bracketOfPlaceholders(activity.id, 2);
    await draw(activity.id);
    for (const m of (await bracket(activity.id)).filter((m) => m.bracketRound === 1)) {
      await prisma.match.update({
        where: { id: m.id },
        data: { status: "PLAYED", homeScore: 2, awayScore: 0 },
      });
    }
    const advance = () =>
      NEXT_ROUND(
        post(`/api/admin/activities/${activity.id}/bracket/next-round`, {}),
        withId(activity.id),
      );
    await advance();

    expect((await advance()).status).toBe(409);
  });
});
