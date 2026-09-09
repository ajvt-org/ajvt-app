import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, put, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import { CHESS_LEVELS, DEEP_LEVELS, SCORED_LEVELS } from "./ladders";

import { PUT as SAVE, GET as READ } from "@/app/api/admin/activities/[id]/levels/route";

async function seriesTournament() {
  return prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, matchShape: "SERIES" },
  });
}

const save = (id: string, levels: object[], moves: object[] = [], worthRules: object[] = []) =>
  SAVE(
    put(`/api/admin/activities/${id}/levels`, {
      levels: levels.map((level, at) => ({ key: `k${at}`, ...level })),
      moves,
      worthRules,
    }),
    withId(id),
  );

const worthRule = (name: string) => ({
  levelKey: "k1",
  name,
  when: ["LOSER_ON_NOTHING"],
  worth: 2,
});

const read = (id: string) => READ(new Request(`http://x/a/${id}/levels`) as never, withId(id));

async function playedMatch(activityId: string, levelId: string) {
  const one = await prisma.team.create({ data: { activityId, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId, ...sideIdData("SERIES", one.id, two.id), status: "PLAYED" },
  });
  await prisma.matchUnit.create({
    data: { matchId: match.id, levelId, order: 1, outcome: "SIDE_A" },
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
    expect(stored[0].endsBy).toBe("COUNT");
    expect(stored[0].unitCount).toBe(2);
    expect(stored[0].countedBy).toBe("OUTCOME");
    expect(stored[1].singular).toBe("لعبة");
    expect(stored[1].endsBy).toBeNull();
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

  it("refuses a level with no number to end it", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [{ ...SCORED_LEVELS[0], target: null }, SCORED_LEVELS[1]]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.targetMissing);
  });

  it("takes a level that ends at a number counted by the outcomes under it", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [
      { ...CHESS_LEVELS[0], endsBy: "TARGET", unitCount: null, target: 12, unsettled: null },
      CHESS_LEVELS[1],
    ]);

    expect(res.status).toBe(200);
  });

  it("needs no ceiling on a level that ends at a number", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, SCORED_LEVELS);
    const stored = await prisma.matchLevel.findFirstOrThrow({
      where: { activityId: activity.id, order: 0 },
    });

    expect(res.status).toBe(200);
    expect(stored.unitCount).toBeNull();
  });

  it("refuses a level with no word for its unit", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [CHESS_LEVELS[0], { ...CHESS_LEVELS[1], singular: "  " }]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.words);
  });

  it("refuses rules on the level that is recorded", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [
      CHESS_LEVELS[0],
      { ...CHESS_LEVELS[1], endsBy: "COUNT", unitCount: 2 },
    ]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.rulesOnTheLastLevel);
  });

  it("takes one counting rule on a level", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, CHESS_LEVELS, [], [worthRule("فكتوار أبيض")]);

    expect(res.status).toBe(200);
    expect(await prisma.worthRule.count({ where: { activityId: activity.id } })).toBe(1);
  });

  it("refuses a second counting rule on the same level", async () => {
    const activity = await seriesTournament();

    const res = await save(
      activity.id,
      CHESS_LEVELS,
      [],
      [worthRule("فكتوار أبيض"), worthRule("تيسه")],
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.worthRule.twice);
    expect(await prisma.worthRule.count({ where: { activityId: activity.id } })).toBe(0);
  });

  it("stores a match of one level counted by the points of that one game", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [{ singular: "مباراة", countedBy: "POINTS" }]);

    expect(res.status).toBe(200);
    const stored = await prisma.matchLevel.findFirstOrThrow({
      where: { activityId: activity.id },
    });
    expect(stored.countedBy).toBe("POINTS");
    expect(stored.endsBy).toBeNull();
    expect(stored.unitCount).toBeNull();
  });

  it("stores a match of one level that says nothing about itself", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [{ singular: "مباراة" }]);

    expect(res.status).toBe(200);
    const stored = await prisma.matchLevel.findFirstOrThrow({
      where: { activityId: activity.id },
    });
    expect(stored.countedBy).toBeNull();
  });

  it("refuses anything but the counting on a match of one level", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, [
      { singular: "مباراة", countedBy: "POINTS", endsBy: "COUNT", unitCount: 2 },
    ]);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.rulesOnTheLastLevel);
  });

  it("refuses a ladder on a football tournament", async () => {
    const activity = await prisma.activity.create({
      data: { title: "بطولة", description: "بطولة", isTournament: true },
    });

    const res = await save(activity.id, CHESS_LEVELS);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.levelsFootballOnly);
  });

  it("locks the whole configuration once a unit has been recorded", async () => {
    const activity = await seriesTournament();
    await save(activity.id, DEEP_LEVELS);
    const levels = (await (await read(activity.id)).json()).levels as { id: string }[];
    await playedMatch(activity.id, levels[2].id);

    const res = await save(activity.id, [
      { ...DEEP_LEVELS[0], id: levels[0].id, key: levels[0].id },
      { ...DEEP_LEVELS[1], id: levels[1].id, key: levels[1].id, singular: "دور" },
      { ...DEEP_LEVELS[2], id: levels[2].id, key: levels[2].id },
    ]);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.configurationLocked.RECORDED);
  });

  it("locks it once the tournament has started, before anything is recorded", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    await prisma.activity.update({
      where: { id: activity.id },
      data: { startsAt: new Date(Date.now() - 60_000) },
    });

    const res = await save(activity.id, CHESS_LEVELS);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.configurationLocked.STARTED);
  });

  it("says a result is in the way rather than a date when both are", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    const levels = (await (await read(activity.id)).json()).levels as { id: string }[];
    await playedMatch(activity.id, levels[1].id);
    await prisma.activity.update({
      where: { id: activity.id },
      data: { startsAt: new Date(Date.now() - 60_000) },
    });

    expect((await (await read(activity.id)).json()).lock).toBe("RECORDED");
  });

  it("stays open while the tournament has not started", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    await prisma.activity.update({
      where: { id: activity.id },
      data: { startsAt: new Date(Date.now() + 60_000) },
    });

    expect((await (await read(activity.id)).json()).lock).toBeNull();
    expect((await save(activity.id, CHESS_LEVELS)).status).toBe(200);
  });

  it("keeps the id of a level it was given back", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS_LEVELS);
    const levels = (await (await read(activity.id)).json()).levels as { id: string }[];

    await save(activity.id, [
      { ...CHESS_LEVELS[0], id: levels[0].id },
      { ...CHESS_LEVELS[1], id: levels[1].id, singular: "دور" },
    ]);

    const after = (await (await read(activity.id)).json()).levels as { id: string }[];
    expect(after.map((level) => level.id)).toEqual(levels.map((level) => level.id));
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
