import { describe, it, expect, beforeEach } from "vitest";
import { POST as SET_UP } from "@/app/api/admin/activities/[id]/tournament-setup/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";

async function tournamentWith(teamCount: number) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true },
  });
  const teams = [];
  for (let i = 0; i < teamCount; i++) {
    teams.push(
      await prisma.team.create({ data: { activityId: activity.id, name: `فريق ${i + 1}` } }),
    );
  }
  return { activity, teams };
}

const setUp = (id: string, body: object) =>
  SET_UP(post(`/api/admin/activities/${id}/tournament-setup`, body), withId(id));

const base = { startsAt: "2026-09-20T16:00", times: ["16:00", "18:00"], venue: null };

function evenGroups(teams: { id: string }[], groupCount: number) {
  return Array.from({ length: groupCount }, (_, g) => ({
    name: `المجموعة ${g + 1}`,
    teamIds: teams.filter((_, i) => i % groupCount === g).map((t) => t.id),
  }));
}

const matches = (activityId: string) =>
  prisma.match.findMany({ where: { activityId }, orderBy: { order: "asc" } });

describe("setting a tournament up in one go", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("writes the groups, the group schedule and the whole bracket", async () => {
    const { activity, teams } = await tournamentWith(12);

    const res = await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 4),
      qualifierCount: 8,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ groupMatches: 12, knockoutMatches: 7 });
    expect(await prisma.group.count({ where: { activityId: activity.id } })).toBe(4);
  });

  it("gives every knockout fixture a day and a kick off but no teams", async () => {
    const { activity, teams } = await tournamentWith(12);
    await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 4),
      qualifierCount: 8,
    });

    const bracket = (await matches(activity.id)).filter((m) => m.isKnockout);

    expect(bracket).toHaveLength(7);
    for (const m of bracket) {
      expect(m.homeTeamId).toBeNull();
      expect(m.awayTeamId).toBeNull();
      expect(m.matchDate).not.toBeNull();
      expect(m.dayId).not.toBeNull();
    }
  });

  it("carries every knockout round through to the final", async () => {
    const { activity, teams } = await tournamentWith(12);
    await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 4),
      qualifierCount: 8,
    });

    const rounds = (await matches(activity.id))
      .filter((m) => m.isKnockout)
      .map((m) => m.bracketRound);

    expect(rounds).toEqual([1, 1, 1, 1, 2, 2, 3]);
  });

  it("runs the same group round across every group before the next", async () => {
    const { activity, teams } = await tournamentWith(12);
    await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 4),
      qualifierCount: 8,
    });

    const rounds = (await matches(activity.id)).filter((m) => !m.isKnockout).map((m) => m.round);

    expect(rounds.slice(0, 4).every((r) => r?.endsWith("الجولة 1"))).toBe(true);
    expect(new Set(rounds.slice(0, 4)).size).toBe(4);
  });

  it("sets the first day and works out the last one", async () => {
    const { activity, teams } = await tournamentWith(8);
    await setUp(activity.id, { ...base, format: "KNOCKOUT", groups: [], qualifierCount: 0 });

    const saved = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    const days = await prisma.tournamentDay.count({ where: { activityId: activity.id } });

    expect(saved.startsAt?.toISOString().slice(0, 10)).toBe("2026-09-20");
    expect(saved.endsAt).not.toBeNull();
    expect(days).toBeGreaterThan(0);
    expect(teams).toHaveLength(8);
  });

  it("lays a straight knockout out with no groups at all", async () => {
    const { activity } = await tournamentWith(8);

    const res = await setUp(activity.id, {
      ...base,
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ groupMatches: 0, knockoutMatches: 7 });
    expect(await prisma.group.count({ where: { activityId: activity.id } })).toBe(0);
  });

  it("refuses a knockout whose team count does not halve to a final", async () => {
    const { activity } = await tournamentWith(6);

    const res = await setUp(activity.id, {
      ...base,
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect(res.status).toBe(400);
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(0);
  });

  it("refuses groups that divide the teams but not the qualifiers", async () => {
    const { activity, teams } = await tournamentWith(12);

    const res = await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 3),
      qualifierCount: 4,
    });

    expect(res.status).toBe(400);
  });

  it("refuses a draw that leaves a team out", async () => {
    const { activity, teams } = await tournamentWith(12);
    const groups = evenGroups(teams, 4);
    groups[0].teamIds = groups[0].teamIds.slice(1);

    const res = await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups,
      qualifierCount: 8,
    });

    expect(res.status).toBe(400);
  });

  it("refuses to reshape a tournament that has a result in it", async () => {
    const { activity, teams } = await tournamentWith(8);
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

    const res = await setUp(activity.id, {
      ...base,
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect(res.status).toBe(409);
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(1);
  });

  it("replaces an earlier setup that has not been played", async () => {
    const { activity, teams } = await tournamentWith(8);
    await setUp(activity.id, { ...base, format: "KNOCKOUT", groups: [], qualifierCount: 0 });

    const res = await setUp(activity.id, {
      ...base,
      format: "GROUPS_THEN_KNOCKOUT",
      groups: evenGroups(teams, 2),
      qualifierCount: 4,
    });

    expect(res.status).toBe(200);
    expect(await prisma.group.count({ where: { activityId: activity.id } })).toBe(2);
    expect((await matches(activity.id)).filter((m) => m.isKnockout)).toHaveLength(3);
  });

  it("refuses a tournament with fewer than two teams", async () => {
    const { activity } = await tournamentWith(1);

    const res = await setUp(activity.id, {
      ...base,
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect(res.status).toBe(400);
  });
});

describe("the clock on a tournament the wizard laid out", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  const saved = (id: string) => prisma.activity.findUniqueOrThrow({ where: { id } });

  it("shows the hour when every match kicks off at the same one", async () => {
    const { activity } = await tournamentWith(8);

    await setUp(activity.id, {
      ...base,
      times: ["18:00"],
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect((await saved(activity.id)).withTime).toBe(true);
  });

  it("leaves the hour off when the days hold more than one kick off", async () => {
    const { activity } = await tournamentWith(8);

    await setUp(activity.id, {
      ...base,
      times: ["16:00", "18:00"],
      format: "KNOCKOUT",
      groups: [],
      qualifierCount: 0,
    });

    expect((await saved(activity.id)).withTime).toBe(false);
  });

  it("turns the hour off again when a second kick off is added", async () => {
    const { activity } = await tournamentWith(8);
    const single = { ...base, times: ["18:00"], format: "KNOCKOUT", groups: [], qualifierCount: 0 };
    await setUp(activity.id, single);

    await setUp(activity.id, { ...single, times: ["16:00", "18:00"] });

    expect((await saved(activity.id)).withTime).toBe(false);
  });
});
