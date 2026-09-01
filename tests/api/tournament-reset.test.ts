import { describe, it, expect, beforeEach } from "vitest";
import {
  GET as COUNTS,
  POST as RESET,
} from "@/app/api/admin/activities/[id]/tournament-reset/route";
import { POST as SET_UP } from "@/app/api/admin/activities/[id]/tournament-setup/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, createUsers, signInAsAdmin, withId } from "./helpers";

const reset = (id: string) =>
  RESET(post(`/api/admin/activities/${id}/tournament-reset`, {}), withId(id));
const counts = (id: string) =>
  COUNTS(get(`/api/admin/activities/${id}/tournament-reset`), withId(id));

async function laidOutTournament() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true },
  });
  const players = await createUsers(8);
  const teams = [];
  for (const [i, player] of players.entries()) {
    teams.push(
      await prisma.team.create({
        data: {
          activityId: activity.id,
          name: `فريق ${i + 1}`,
          members: { create: { userId: player.id, status: "ACTIVE" } },
        },
      }),
    );
  }
  for (const player of players) {
    await prisma.activityRegistration.create({
      data: { activityId: activity.id, userId: player.id, status: "ACTIVE" },
    });
  }

  const setUp = await SET_UP(
    post(`/api/admin/activities/${activity.id}/tournament-setup`, {
      format: "GROUPS_THEN_KNOCKOUT",
      groups: [
        { name: "المجموعة 1", teamIds: teams.slice(0, 4).map((t) => t.id) },
        { name: "المجموعة 2", teamIds: teams.slice(4).map((t) => t.id) },
      ],
      qualifierCount: 4,
      startsAt: "2026-09-20T16:00",
      times: ["16:00", "18:00"],
      venue: null,
    }),
    withId(activity.id),
  );
  if (setUp.status !== 200) throw new Error(JSON.stringify(await setUp.json()));

  return { activity, teams, players };
}

async function playTheGroupStage(activityId: string) {
  const group = await prisma.match.findMany({ where: { activityId, isKnockout: false } });
  for (const m of group) {
    await prisma.match.update({
      where: { id: m.id },
      data: { status: "PLAYED", homeScore: 2, awayScore: 1 },
    });
  }
  return group.length;
}

const leftIn = (activityId: string) =>
  Promise.all([
    prisma.match.count({ where: { activityId } }),
    prisma.group.count({ where: { activityId } }),
    prisma.tournamentDay.count({ where: { activityId } }),
    prisma.team.count({ where: { activityId } }),
    prisma.teamMember.count({ where: { team: { activityId } } }),
    prisma.activityRegistration.count({ where: { activityId } }),
  ]);

describe("putting a tournament back to its teams", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("clears the fixtures, the groups and the days of a tournament with no results", async () => {
    const { activity } = await laidOutTournament();

    const res = await reset(activity.id);

    expect(res.status).toBe(200);
    const [matches, groups, days] = await leftIn(activity.id);
    expect([matches, groups, days]).toEqual([0, 0, 0]);
  });

  it("clears a tournament that has been played, results and all", async () => {
    const { activity } = await laidOutTournament();
    const played = await playTheGroupStage(activity.id);
    expect(played).toBeGreaterThan(0);

    const res = await reset(activity.id);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ results: played });
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(0);
  });

  it("leaves the teams, the squads and the registrations where they are", async () => {
    const { activity } = await laidOutTournament();
    await playTheGroupStage(activity.id);
    const before = await leftIn(activity.id);

    await reset(activity.id);

    const after = await leftIn(activity.id);
    expect(after.slice(3)).toEqual(before.slice(3));
    expect(after.slice(3)).toEqual([8, 8, 8]);
  });

  it("unhooks every team from the group it was drawn into", async () => {
    const { activity } = await laidOutTournament();
    expect(
      await prisma.team.count({ where: { activityId: activity.id, groupId: { not: null } } }),
    ).toBe(8);

    await reset(activity.id);

    expect(
      await prisma.team.count({ where: { activityId: activity.id, groupId: { not: null } } }),
    ).toBe(0);
  });

  it("ends a suspension that was still open and leaves a lifted one alone", async () => {
    const { activity, players } = await laidOutTournament();
    await prisma.suspension.create({
      data: {
        activityId: activity.id,
        userId: players[0].id,
        reason: "RED_CARD",
        scope: "MATCHES",
        matches: 2,
        status: "ACTIVE",
        createdBy: "admin",
      },
    });
    await prisma.suspension.create({
      data: {
        activityId: activity.id,
        userId: players[1].id,
        reason: "RED_CARD",
        scope: "MATCHES",
        matches: 0,
        status: "LIFTED",
        createdBy: "admin",
      },
    });

    await reset(activity.id);

    const left = await prisma.suspension.findMany({ where: { activityId: activity.id } });
    expect(left.map((s) => s.status)).toEqual(["LIFTED"]);
  });

  it("clears the end date the day plan set", async () => {
    const { activity } = await laidOutTournament();
    expect(
      (await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } })).endsAt,
    ).not.toBeNull();

    await reset(activity.id);

    expect(
      (await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } })).endsAt,
    ).toBeNull();
  });

  it("writes a log entry for the reset", async () => {
    const { activity } = await laidOutTournament();

    await reset(activity.id);

    expect(await prisma.auditLog.count({ where: { action: "RESET_TOURNAMENT" } })).toBe(1);
  });

  it("lets the wizard run again on a tournament that had results", async () => {
    const { activity, teams } = await laidOutTournament();
    await playTheGroupStage(activity.id);
    await reset(activity.id);

    const res = await SET_UP(
      post(`/api/admin/activities/${activity.id}/tournament-setup`, {
        format: "GROUPS_THEN_KNOCKOUT",
        groups: [
          { name: "المجموعة 1", teamIds: teams.filter((_, i) => i % 2 === 0).map((t) => t.id) },
          { name: "المجموعة 2", teamIds: teams.filter((_, i) => i % 2 === 1).map((t) => t.id) },
        ],
        qualifierCount: 4,
        startsAt: "2026-10-01T16:00",
        times: ["16:00"],
        venue: null,
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBeGreaterThan(0);
  });

  it("refuses an activity that is not a tournament", async () => {
    const activity = await prisma.activity.create({
      data: { title: "حملة", description: "حملة" },
    });

    expect((await reset(activity.id)).status).toBe(400);
  });
});

describe("what a reset says it will delete", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("counts the fixtures, the results, the groups and the days", async () => {
    const { activity } = await laidOutTournament();
    const played = await playTheGroupStage(activity.id);

    const body = await (await counts(activity.id)).json();

    expect(body).toMatchObject({ results: played, groups: 2 });
    expect(body.matches).toBe(await prisma.match.count({ where: { activityId: activity.id } }));
    expect(body.days).toBe(
      await prisma.tournamentDay.count({ where: { activityId: activity.id } }),
    );
  });

  it("counts an open suspension and not one already lifted", async () => {
    const { activity, players } = await laidOutTournament();
    await prisma.suspension.create({
      data: {
        activityId: activity.id,
        userId: players[0].id,
        reason: "RED_CARD",
        scope: "INDEFINITE",
        status: "PROPOSED",
        createdBy: "admin",
      },
    });
    await prisma.suspension.create({
      data: {
        activityId: activity.id,
        userId: players[1].id,
        reason: "RED_CARD",
        scope: "MATCHES",
        matches: 0,
        status: "LIFTED",
        createdBy: "admin",
      },
    });

    expect(await (await counts(activity.id)).json()).toMatchObject({ suspensions: 1 });
  });

  it("changes nothing by asking", async () => {
    const { activity } = await laidOutTournament();
    const before = await leftIn(activity.id);

    await counts(activity.id);

    expect(await leftIn(activity.id)).toEqual(before);
  });
});
