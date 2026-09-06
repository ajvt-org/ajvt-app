import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";
import type { MatchShape } from "@prisma/client";

import { POST as CREATE } from "@/app/api/admin/activities/[id]/matches/route";
import { PATCH as EDIT } from "@/app/api/admin/matches/[matchId]/route";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";

async function tournamentWith(matchShape: MatchShape, teamCount = 4) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      format: "KNOCKOUT",
      matchShape,
    },
  });
  const teams = [];
  for (let i = 0; i < teamCount; i++) {
    teams.push(
      await prisma.team.create({ data: { activityId: activity.id, name: `طرف ${i + 1}` } }),
    );
  }
  return { activity, teams };
}

const create = (id: string, body: object) =>
  CREATE(post(`/api/admin/activities/${id}/matches`, body), withId(id));

const edit = (matchId: string, body: object) =>
  EDIT(patch(`/api/admin/matches/${matchId}`, body), { params: Promise.resolve({ matchId }) });

const draw = (id: string) => DRAW(post(`/api/admin/activities/${id}/bracket/draw`, {}), withId(id));

describe("the two sides of a match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("puts a football match on home and away", async () => {
    const { activity, teams } = await tournamentWith("FOOTBALL");

    const res = await create(activity.id, {
      firstTeamId: teams[0].id,
      secondTeamId: teams[1].id,
    });

    expect(res.status).toBe(201);
    const match = await prisma.match.findFirstOrThrow({ where: { activityId: activity.id } });
    expect(match.homeTeamId).toBe(teams[0].id);
    expect(match.awayTeamId).toBe(teams[1].id);
    expect(match.sideATeamId).toBeNull();
    expect(match.sideBTeamId).toBeNull();
  });

  it("puts a series match on the pair that claims no venue", async () => {
    const { activity, teams } = await tournamentWith("SERIES");

    const res = await create(activity.id, {
      firstTeamId: teams[0].id,
      secondTeamId: teams[1].id,
    });

    expect(res.status).toBe(201);
    const match = await prisma.match.findFirstOrThrow({ where: { activityId: activity.id } });
    expect(match.sideATeamId).toBe(teams[0].id);
    expect(match.sideBTeamId).toBe(teams[1].id);
    expect(match.homeTeamId).toBeNull();
    expect(match.awayTeamId).toBeNull();
  });

  it("changes the sides of a series match on its own pair", async () => {
    const { activity, teams } = await tournamentWith("SERIES");
    await create(activity.id, { firstTeamId: teams[0].id, secondTeamId: teams[1].id });
    const match = await prisma.match.findFirstOrThrow({ where: { activityId: activity.id } });

    const res = await edit(match.id, { firstTeamId: teams[2].id, secondTeamId: teams[3].id });

    expect(res.status).toBe(200);
    const moved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(moved.sideATeamId).toBe(teams[2].id);
    expect(moved.sideBTeamId).toBe(teams[3].id);
    expect(moved.homeTeamId).toBeNull();
  });

  it("refuses a series match of one side against itself", async () => {
    const { activity, teams } = await tournamentWith("SERIES");

    const res = await create(activity.id, {
      firstTeamId: teams[0].id,
      secondTeamId: teams[0].id,
    });

    expect(res.status).toBe(400);
  });

  it("draws a series bracket onto the series pair", async () => {
    const { activity } = await tournamentWith("SERIES");

    const res = await draw(activity.id);

    expect(res.status).toBe(200);
    const drawn = await prisma.match.findMany({ where: { activityId: activity.id } });
    expect(drawn).toHaveLength(2);
    expect(drawn.every((m) => m.sideATeamId !== null && m.sideBTeamId !== null)).toBe(true);
    expect(drawn.every((m) => m.homeTeamId === null && m.awayTeamId === null)).toBe(true);
  });

  it("draws a football bracket onto home and away", async () => {
    const { activity } = await tournamentWith("FOOTBALL");

    await draw(activity.id);

    const drawn = await prisma.match.findMany({ where: { activityId: activity.id } });
    expect(drawn.every((m) => m.homeTeamId !== null && m.awayTeamId !== null)).toBe(true);
    expect(drawn.every((m) => m.sideATeamId === null && m.sideBTeamId === null)).toBe(true);
  });

  it("takes a side out of a series match when its entrant is deleted", async () => {
    const { activity, teams } = await tournamentWith("SERIES");
    await create(activity.id, { firstTeamId: teams[0].id, secondTeamId: teams[1].id });

    await prisma.team.delete({ where: { id: teams[0].id } });

    expect(await prisma.match.count({ where: { activityId: activity.id } })).toBe(0);
  });
});
