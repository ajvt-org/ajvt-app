import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import { CHESS_LEVELS, SCORED_LEVELS } from "./ladders";

import { PUT as SAVE, GET as READ } from "@/app/api/admin/activities/[id]/levels/route";

async function seriesTournament() {
  return prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, matchShape: "SERIES" },
  });
}

const save = (id: string, levels: object[]) =>
  SAVE(put(`/api/admin/activities/${id}/levels`, { levels }), withId(id));

const read = (id: string) => READ(new Request(`http://x/a/${id}/levels`) as never, withId(id));

async function playedMatch(activityId: string) {
  const one = await prisma.team.create({ data: { activityId, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId, name: "ب" } });
  await prisma.match.create({
    data: { activityId, ...sideIdData("SERIES", one.id, two.id), status: "PLAYED" },
  });
}

describe("declaring the levels of a series tournament", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("stores a match played out in full and decided by outcome", async () => {
    const activity = await seriesTournament();

    expect((await save(activity.id, CHESS_LEVELS)).status).toBe(200);

    const stored = await prisma.matchLevel.findMany({
      where: { activityId: activity.id },
      orderBy: { order: "asc" },
    });
    expect(stored.map((level) => level.order)).toEqual([0, 1]);
    expect(stored[0].ending).toBe("PLAY_ALL");
    expect(stored[0].unitsPerParent).toBe(2);
    expect(stored[1].singular).toBe("لعبة");
    expect(stored[1].decision).toBe("OUTCOME");
  });

  it("stores a match that stops when one side has enough", async () => {
    const activity = await seriesTournament();

    expect((await save(activity.id, SCORED_LEVELS)).status).toBe(200);
  });

  it("reads the ladder back in order", async () => {
    const activity = await seriesTournament();
    await save(activity.id, SCORED_LEVELS);

    const body = await (await read(activity.id)).json();

    expect(body.levels.map((level: { singular: string }) => level.singular)).toEqual([
      "المباراة",
      "جولة",
    ]);
  });

  it("replaces the ladder rather than adding to it", async () => {
    const activity = await seriesTournament();
    await save(activity.id, SCORED_LEVELS);
    await save(activity.id, CHESS_LEVELS);

    expect(await prisma.matchLevel.count({ where: { activityId: activity.id } })).toBe(2);
  });

  it("refuses a count of units the level cannot reach", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [{ ...SCORED_LEVELS[0], unitsToWin: 5 }, SCORED_LEVELS[1]]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.unitsToWinUnreachable);
  });

  it("refuses a level with no word for its unit", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [CHESS_LEVELS[0], { ...CHESS_LEVELS[1], singular: "  " }]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.words);
  });

  it("refuses a level ending on the level that is recorded", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [
      CHESS_LEVELS[0],
      { ...CHESS_LEVELS[1], ending: "PLAY_ALL", unitsPerParent: 2 },
    ]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.endingOnTheLastLevel);
  });

  it("refuses a ladder on a football tournament", async () => {
    const activity = await prisma.activity.create({
      data: { title: "بطولة", description: "بطولة", isTournament: true },
    });

    const res = await save(activity.id, CHESS_LEVELS);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.levelsFootballOnly);
  });

  it("refuses a change once a match has been played", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    await playedMatch(activity.id);

    const res = await save(activity.id, SCORED_LEVELS);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.levelsLocked);
  });

  it("takes the levels away with the tournament", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);

    await prisma.activity.delete({ where: { id: activity.id } });

    expect(await prisma.matchLevel.count()).toBe(0);
  });

  it("takes the units of a match away with the match", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    const level = await prisma.matchLevel.findFirstOrThrow({
      where: { activityId: activity.id, order: 1 },
    });
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    const match = await prisma.match.create({
      data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
    });
    await prisma.matchUnit.create({
      data: { matchId: match.id, levelId: level.id, order: 1, outcome: "SIDE_A" },
    });

    await prisma.match.delete({ where: { id: match.id } });

    expect(await prisma.matchUnit.count()).toBe(0);
  });
});
