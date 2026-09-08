import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, del, createAdmin, signInAsAdmin } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import type { Prisma } from "@prisma/client";
import {
  CHESS_LEVELS,
  KNOCKOUT_LEVELS,
  SCORED_LEVELS,
  ladderData,
  MATCH_LEVEL,
  type LevelFixture,
} from "./ladders";

import { GET as LIST, POST as ADD } from "@/app/api/admin/matches/[matchId]/units/route";
import {
  PATCH as CORRECT,
  DELETE as REMOVE,
} from "@/app/api/admin/matches/[matchId]/units/[unitId]/route";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";
import { POST as NEXT_ROUND } from "@/app/api/admin/activities/[id]/bracket/next-round/route";

const CHESS = CHESS_LEVELS;

const COUNTED = SCORED_LEVELS;

async function matchOf(
  levels: LevelFixture[],
  matchShape: "FOOTBALL" | "SERIES" = "SERIES",
  colours: Prisma.ActivityCreateInput | object = {},
) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      matchShape,
      levels: ladderData(levels),
      ...colours,
    },
  });
  const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId: activity.id, ...sideIdData(matchShape, one.id, two.id) },
  });
  return { activity, match };
}

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });
const withUnit = (matchId: string, unitId: string) => ({
  params: Promise.resolve({ matchId, unitId }),
});

const list = (matchId: string) =>
  LIST(get(`/api/admin/matches/${matchId}/units`), withMatch(matchId));
const add = (matchId: string, body: object) =>
  ADD(post(`/api/admin/matches/${matchId}/units`, body), withMatch(matchId));
const correct = (matchId: string, unitId: string, body: object) =>
  CORRECT(patch(`/api/admin/matches/${matchId}/units/${unitId}`, body), withUnit(matchId, unitId));
const remove = (matchId: string, unitId: string) =>
  REMOVE(del(`/api/admin/matches/${matchId}/units/${unitId}`), withUnit(matchId, unitId));

describe("recording the units of a series match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("says where a match with no units stands", async () => {
    const { match } = await matchOf(CHESS);

    const body = await (await list(match.id)).json();

    expect(body.units).toEqual([]);
    expect(body.standing.sideATotal).toBe(0);
    expect(body.standing.unitsLeft).toBe(2);
    expect(body.standing.over).toBe(false);
  });

  it("records a unit decided by outcome and moves the total", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.units).toHaveLength(1);
    expect(body.units[0].order).toBe(1);
    expect(body.standing.sideATotal).toBe(2);
  });

  it("splits a drawn unit", async () => {
    const { match } = await matchOf(CHESS);

    const body = await (await add(match.id, { outcome: "DRAW" })).json();

    expect(body.standing.sideATotal).toBe(1);
    expect(body.standing.sideBTotal).toBe(1);
  });

  it("refuses an outcome the mode does not know", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { outcome: "MAYBE" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsAnOutcome);
  });

  it("refuses two scores where the unit is decided by outcome", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { sideAPoints: 3, sideBPoints: 1 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsAnOutcome);
  });

  it("records a unit played to a target", async () => {
    const { match } = await matchOf(COUNTED);

    const body = await (await add(match.id, { sideAPoints: 101, sideBPoints: 74 })).json();

    expect(body.standing.sideATotal).toBe(101);
    expect(body.units[0].sideAPoints).toBe(101);
  });

  it("refuses a unit with a missing score", async () => {
    const { match } = await matchOf(COUNTED);

    const res = await add(match.id, { sideAPoints: 101 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsTwoScores);
  });

  it("takes a free score with no target", async () => {
    const { match } = await matchOf([
      { ...MATCH_LEVEL, countedBy: "POINTS", unitCount: 1 },
      { singular: "شوط", plural: "أشواط" },
    ]);

    const res = await add(match.id, { sideAPoints: 3, sideBPoints: 1 });

    expect(res.status).toBe(201);
    expect((await res.json()).standing.over).toBe(true);
  });

  it("stops accepting units once every one has been played", async () => {
    const { match } = await matchOf(CHESS);
    await add(match.id, { outcome: "SIDE_A" });
    await add(match.id, { outcome: "SIDE_A" });

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.matchTakesNoMoreParts);
  });

  it("stops accepting units once a side has reached the target", async () => {
    const { match } = await matchOf(COUNTED);
    await add(match.id, { sideAPoints: 101, sideBPoints: 20 });
    await add(match.id, { sideAPoints: 101, sideBPoints: 30 });

    const res = await add(match.id, { sideAPoints: 101, sideBPoints: 40 });

    expect(res.status).toBe(409);
  });

  it("corrects a unit while the match is unfinished", async () => {
    const { match } = await matchOf(CHESS);
    const added = await (await add(match.id, { outcome: "SIDE_A" })).json();

    const body = await (await correct(match.id, added.unit.id, { outcome: "SIDE_B" })).json();

    expect(body.standing.sideATotal).toBe(0);
    expect(body.standing.sideBTotal).toBe(2);
  });

  it("removes a unit and gives its total back", async () => {
    const { match } = await matchOf(CHESS);
    const added = await (await add(match.id, { outcome: "SIDE_A" })).json();

    const body = await (await remove(match.id, added.unit.id)).json();

    expect(body.units).toEqual([]);
    expect(body.standing.sideATotal).toBe(0);
  });

  it("says nothing found for a unit of another match", async () => {
    const { match } = await matchOf(CHESS);

    expect((await remove(match.id, "nope")).status).toBe(404);
  });

  it("refuses units on a football match", async () => {
    const { match } = await matchOf([], "FOOTBALL");

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partsFootballOnly);
  });

  it("refuses units before the tournament says what a match is made of", async () => {
    const { match } = await matchOf([]);

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.seriesNotConfigured);
  });
});

describe("a series knockout that advances on its units", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes the winner from the units rather than from a score", async () => {
    const activity = await prisma.activity.create({
      data: {
        title: "بطولة",
        description: "بطولة",
        isTournament: true,
        format: "KNOCKOUT",
        matchShape: "SERIES",
        levels: ladderData(CHESS),
      },
    });
    for (const name of ["أ", "ب", "ج", "د"]) {
      await prisma.team.create({ data: { activityId: activity.id, name } });
    }

    await DRAW(post(`/api/admin/activities/${activity.id}/bracket/draw`, {}), {
      params: Promise.resolve({ id: activity.id }),
    });

    const drawn = await prisma.match.findMany({
      where: { activityId: activity.id },
      orderBy: { order: "asc" },
    });
    for (const match of drawn) {
      await add(match.id, { outcome: "SIDE_A" });
      await add(match.id, { outcome: "SIDE_A" });
      await prisma.match.update({ where: { id: match.id }, data: { status: "PLAYED" } });
    }

    const res = await NEXT_ROUND(
      post(`/api/admin/activities/${activity.id}/bracket/next-round`, {}),
      {
        params: Promise.resolve({ id: activity.id }),
      },
    );

    expect(res.status).toBe(200);
    const final = await prisma.match.findFirstOrThrow({
      where: { activityId: activity.id, bracketRound: 2 },
    });
    expect(final.sideATeamId).toBe(drawn[0].sideATeamId);
    expect(final.sideBTeamId).toBe(drawn[1].sideATeamId);
  });
});

describe("the colours of a series match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function colouredMatch(opensAs: "FIRST" | "SECOND" | null) {
    const { match } = await matchOf(CHESS, "SERIES", {
      hasColours: true,
      firstColourWord: "أبيض",
      secondColourWord: "أسود",
    });
    if (opensAs) {
      await prisma.match.update({ where: { id: match.id }, data: { sideAOpensAs: opensAs } });
    }
    return match;
  }

  it("gives the first unit the colour the draw set", async () => {
    const match = await colouredMatch("FIRST");

    const body = await (await add(match.id, { outcome: "SIDE_A" })).json();

    expect(body.units[0].sideAColour).toBe("FIRST");
  });

  it("turns the colours over on the next unit", async () => {
    const match = await colouredMatch("FIRST");
    await add(match.id, { outcome: "SIDE_A" });

    const body = await (await add(match.id, { outcome: "SIDE_B" })).json();

    expect(body.units.map((p: { sideAColour: string }) => p.sideAColour)).toEqual([
      "FIRST",
      "SECOND",
    ]);
  });

  it("records no colour where the tournament has none", async () => {
    const { match } = await matchOf(CHESS);

    const body = await (await add(match.id, { outcome: "SIDE_A" })).json();

    expect(body.units[0].sideAColour).toBeNull();
  });

  it("records no colour where the draw never set one", async () => {
    const match = await colouredMatch(null);

    const body = await (await add(match.id, { outcome: "SIDE_A" })).json();

    expect(body.units[0].sideAColour).toBeNull();
  });
});

describe("a level match on a level that extends", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes another pair of units rather than standing level", async () => {
    const { match } = await matchOf(KNOCKOUT_LEVELS);
    await add(match.id, { outcome: "DRAW" });

    const body = await (await add(match.id, { outcome: "DRAW" })).json();

    expect(body.standing.over).toBe(false);
    expect(body.standing.extending).toBe(true);
    expect(body.standing.unitsLeft).toBe(2);
    expect((await add(match.id, { outcome: "SIDE_A" })).status).toBe(201);
  });

  it("stands level when the level does not extend", async () => {
    const { match } = await matchOf(CHESS);
    await add(match.id, { outcome: "DRAW" });

    const body = await (await add(match.id, { outcome: "DRAW" })).json();

    expect(body.standing.over).toBe(true);
    expect(body.standing.level).toBe(true);
    expect((await add(match.id, { outcome: "SIDE_A" })).status).toBe(409);
  });

  it("keeps the colours level across the pair it is extended by", async () => {
    const { match } = await matchOf(KNOCKOUT_LEVELS, "SERIES", {
      hasColours: true,
      firstColourWord: "أبيض",
      secondColourWord: "أسود",
    });
    await prisma.match.update({
      where: { id: match.id },
      data: { isKnockout: true, sideAOpensAs: "FIRST" },
    });
    await add(match.id, { outcome: "DRAW" });
    await add(match.id, { outcome: "DRAW" });
    await add(match.id, { outcome: "DRAW" });

    const body = await (await add(match.id, { outcome: "DRAW" })).json();

    expect(body.units.map((p: { sideAColour: string }) => p.sideAColour)).toEqual([
      "FIRST",
      "SECOND",
      "FIRST",
      "SECOND",
    ]);
  });
});

describe("a unit recorded under another", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  const CARDS: LevelFixture[] = [
    { ...MATCH_LEVEL, unsettled: "DECIDER" },
    {
      singular: "شوط",
      plural: "أشواط",
      countedBy: "POINTS",
      endsBy: "TARGET",
      target: 100,
    },
    { singular: "نقطة", plural: "نقاط" },
  ];

  async function unitOf(matchId: string, body: object) {
    const answer = await (await add(matchId, body)).json();
    return answer.unit.id as string;
  }

  it("takes its score from what sits under it", async () => {
    const { match } = await matchOf(CARDS);
    const set = await unitOf(match.id, { outcome: "SIDE_B" });
    await add(match.id, { parentId: set, sideAPoints: 60, sideBPoints: 0 });

    const body = await (
      await add(match.id, { parentId: set, sideAPoints: 45, sideBPoints: 0 })
    ).json();

    expect(body.units[0].standing.sideATotal).toBe(105);
    expect(body.units[0].standing.over).toBe(true);
    expect(body.standing.sideATotal).toBe(2);
  });

  it("counts its own order under its parent rather than across the match", async () => {
    const { match } = await matchOf(CARDS);
    const one = await unitOf(match.id, { outcome: "SIDE_A" });
    const two = await unitOf(match.id, { outcome: "SIDE_B" });
    await add(match.id, { parentId: one, sideAPoints: 1, sideBPoints: 0 });

    const body = await (
      await add(match.id, { parentId: two, sideAPoints: 0, sideBPoints: 1 })
    ).json();

    expect(body.units.map((unit: { order: number }) => unit.order)).toEqual([1, 2]);
    expect(body.units[0].children[0].order).toBe(1);
    expect(body.units[1].children[0].order).toBe(1);
  });

  it("refuses a typed score on a unit that has something under it", async () => {
    const { match } = await matchOf(CARDS);
    const set = await unitOf(match.id, { outcome: "SIDE_A" });
    await add(match.id, { parentId: set, sideAPoints: 1, sideBPoints: 0 });

    const res = await correct(match.id, set, { outcome: "SIDE_B" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.unitTakesItsScoreFromBelow);
  });

  it("refuses a unit under the level that is recorded", async () => {
    const { match } = await matchOf(CARDS);
    const set = await unitOf(match.id, { outcome: "SIDE_A" });
    const point = await unitOf(match.id, { parentId: set, sideAPoints: 1, sideBPoints: 0 });

    const res = await add(match.id, { parentId: point, sideAPoints: 1, sideBPoints: 0 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.unitLevelMissing);
  });

  it("takes the children away with the unit above them", async () => {
    const { match } = await matchOf(CARDS);
    const set = await unitOf(match.id, { outcome: "SIDE_A" });
    await add(match.id, { parentId: set, sideAPoints: 1, sideBPoints: 0 });

    const body = await (await remove(match.id, set)).json();

    expect(body.units).toEqual([]);
  });
});

describe("opening a unit that already carries a score", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  const NESTED: LevelFixture[] = [
    { ...MATCH_LEVEL, unsettled: "DECIDER" },
    {
      singular: "شوط",
      plural: "أشواط",
      countedBy: "POINTS",
      endsBy: "TARGET",
      target: 100,
    },
    { singular: "نقطة", plural: "نقاط" },
  ];

  it("lets go of the typed result when the first unit is recorded under it", async () => {
    const { match } = await matchOf(NESTED);
    const answer = await (await add(match.id, { outcome: "SIDE_B" })).json();

    const body = await (
      await add(match.id, { parentId: answer.unit.id, sideAPoints: 101, sideBPoints: 20 })
    ).json();

    expect(body.units[0].outcome).toBeNull();
    expect(body.units[0].standing.sideATotal).toBe(101);
  });

  it("keeps the typed result of a unit nothing was recorded under", async () => {
    const { match } = await matchOf(NESTED);
    const answer = await (await add(match.id, { outcome: "SIDE_A" })).json();

    const body = await (await add(match.id, { outcome: "SIDE_B" })).json();

    expect(body.units[0].id).toBe(answer.unit.id);
    expect(body.units[0].outcome).toBe("SIDE_A");
  });
});
