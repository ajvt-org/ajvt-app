import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, del, createAdmin, signInAsAdmin } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";

import { GET as LIST, POST as ADD } from "@/app/api/admin/matches/[matchId]/parts/route";
import {
  PATCH as CORRECT,
  DELETE as REMOVE,
} from "@/app/api/admin/matches/[matchId]/parts/[partId]/route";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";
import { POST as NEXT_ROUND } from "@/app/api/admin/activities/[id]/bracket/next-round/route";

const CHESS = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL" as const,
  partDecision: "OUTCOME" as const,
  partWord: "لعبة",
  partsWord: "ألعاب",
};

const MARYASS = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO" as const,
  partsToWin: 2,
  partDecision: "POINTS" as const,
  partTarget: 100,
  partWord: "جولة",
  partsWord: "جولات",
};

async function matchOf(setup: object, matchShape: "FOOTBALL" | "SERIES" = "SERIES") {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      matchShape,
      ...setup,
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
const withPart = (matchId: string, partId: string) => ({
  params: Promise.resolve({ matchId, partId }),
});

const list = (matchId: string) =>
  LIST(get(`/api/admin/matches/${matchId}/parts`), withMatch(matchId));
const add = (matchId: string, body: object) =>
  ADD(post(`/api/admin/matches/${matchId}/parts`, body), withMatch(matchId));
const correct = (matchId: string, partId: string, body: object) =>
  CORRECT(patch(`/api/admin/matches/${matchId}/parts/${partId}`, body), withPart(matchId, partId));
const remove = (matchId: string, partId: string) =>
  REMOVE(del(`/api/admin/matches/${matchId}/parts/${partId}`), withPart(matchId, partId));

describe("recording the parts of a series match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("says where a match with no parts stands", async () => {
    const { match } = await matchOf(CHESS);

    const body = await (await list(match.id)).json();

    expect(body.parts).toEqual([]);
    expect(body.standing.sideAHalves).toBe(0);
    expect(body.standing.partsLeft).toBe(2);
    expect(body.standing.over).toBe(false);
  });

  it("records a part decided by outcome and moves the total", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.parts).toHaveLength(1);
    expect(body.parts[0].order).toBe(1);
    expect(body.standing.sideAHalves).toBe(2);
  });

  it("splits a drawn part", async () => {
    const { match } = await matchOf(CHESS);

    const body = await (await add(match.id, { outcome: "DRAW" })).json();

    expect(body.standing.sideAHalves).toBe(1);
    expect(body.standing.sideBHalves).toBe(1);
  });

  it("refuses an outcome the mode does not know", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { outcome: "MAYBE" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsAnOutcome);
  });

  it("refuses two scores where the part is decided by outcome", async () => {
    const { match } = await matchOf(CHESS);

    const res = await add(match.id, { sideAPoints: 3, sideBPoints: 1 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsAnOutcome);
  });

  it("records a part played to a target", async () => {
    const { match } = await matchOf(MARYASS);

    const body = await (await add(match.id, { sideAPoints: 101, sideBPoints: 74 })).json();

    expect(body.standing.sideAHalves).toBe(2);
    expect(body.parts[0].sideAPoints).toBe(101);
  });

  it("refuses a part that never reached its target", async () => {
    const { match } = await matchOf(MARYASS);

    const res = await add(match.id, { sideAPoints: 40, sideBPoints: 30 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partBelowItsTarget(100));
  });

  it("refuses a part with a missing score", async () => {
    const { match } = await matchOf(MARYASS);

    const res = await add(match.id, { sideAPoints: 101 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partWantsTwoScores);
  });

  it("takes a free score with no target", async () => {
    const { match } = await matchOf({
      partsPerMatch: 1,
      matchEnding: "PLAY_ALL",
      partDecision: "SCORE",
      partWord: "شوط",
      partsWord: "أشواط",
    });

    const res = await add(match.id, { sideAPoints: 3, sideBPoints: 1 });

    expect(res.status).toBe(201);
    expect((await res.json()).standing.over).toBe(true);
  });

  it("stops accepting parts once every one has been played", async () => {
    const { match } = await matchOf(CHESS);
    await add(match.id, { outcome: "SIDE_A" });
    await add(match.id, { outcome: "SIDE_A" });

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.matchTakesNoMoreParts);
  });

  it("stops accepting parts once a side has reached the target", async () => {
    const { match } = await matchOf(MARYASS);
    await add(match.id, { sideAPoints: 101, sideBPoints: 20 });
    await add(match.id, { sideAPoints: 101, sideBPoints: 30 });

    const res = await add(match.id, { sideAPoints: 101, sideBPoints: 40 });

    expect(res.status).toBe(409);
  });

  it("corrects a part while the match is unfinished", async () => {
    const { match } = await matchOf(CHESS);
    const added = await (await add(match.id, { outcome: "SIDE_A" })).json();

    const body = await (await correct(match.id, added.part.id, { outcome: "SIDE_B" })).json();

    expect(body.standing.sideAHalves).toBe(0);
    expect(body.standing.sideBHalves).toBe(2);
  });

  it("removes a part and gives its total back", async () => {
    const { match } = await matchOf(CHESS);
    const added = await (await add(match.id, { outcome: "SIDE_A" })).json();

    const body = await (await remove(match.id, added.part.id)).json();

    expect(body.parts).toEqual([]);
    expect(body.standing.sideAHalves).toBe(0);
  });

  it("says nothing found for a part of another match", async () => {
    const { match } = await matchOf(CHESS);

    expect((await remove(match.id, "nope")).status).toBe(404);
  });

  it("refuses parts on a football match", async () => {
    const { match } = await matchOf({}, "FOOTBALL");

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.partsFootballOnly);
  });

  it("refuses parts before the tournament says what a match is made of", async () => {
    const { match } = await matchOf({});

    const res = await add(match.id, { outcome: "SIDE_A" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.seriesNotConfigured);
  });
});

describe("a series knockout that advances on its parts", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes the winner from the parts rather than from a score", async () => {
    const activity = await prisma.activity.create({
      data: {
        title: "بطولة",
        description: "بطولة",
        isTournament: true,
        format: "KNOCKOUT",
        matchShape: "SERIES",
        ...CHESS,
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
