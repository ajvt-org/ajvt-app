import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";

import { PATCH as SAVE } from "@/app/api/admin/activities/[id]/route";

const CHESS = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL",
  partDecision: "OUTCOME",
  partWord: "لعبة",
  partsWord: "ألعاب",
};

async function seriesTournament() {
  return prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, matchShape: "SERIES" },
  });
}

const save = (id: string, body: object) =>
  SAVE(patch(`/api/admin/activities/${id}`, body), withId(id));

describe("setting up a series tournament", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("stores a match played out in full and decided by outcome", async () => {
    const activity = await seriesTournament();

    expect((await save(activity.id, CHESS)).status).toBe(200);

    const stored = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(stored.partsPerMatch).toBe(2);
    expect(stored.matchEnding).toBe("PLAY_ALL");
    expect(stored.partDecision).toBe("OUTCOME");
    expect(stored.partWord).toBe("لعبة");
  });

  it("stores a match that stops when one side has enough", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, {
      partsPerMatch: 3,
      matchEnding: "FIRST_TO",
      partsToWin: 2,
      partDecision: "POINTS",
      partTarget: 100,
      partWord: "جولة",
      partsWord: "جولات",
    });

    expect(res.status).toBe(200);
  });

  it("refuses a points target on a part decided by outcome", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, { ...CHESS, partTarget: 100 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.targetOnAnOutcome);
  });

  it("refuses a free score carrying a target", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, { ...CHESS, partDecision: "SCORE", partTarget: 21 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.targetOnAFreeScore);
  });

  it("refuses a number of parts to win the match cannot reach", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, {
      ...CHESS,
      matchEnding: "FIRST_TO",
      partsToWin: 5,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.partsToWinUnreachable);
  });

  it("refuses a setup with no word for one part", async () => {
    const activity = await seriesTournament();

    const res = await save(activity.id, { ...CHESS, partWord: "  " });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesSetup.partWords);
  });

  it("refuses a change once a match has been played", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS);
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        ...sideIdData("SERIES", one.id, two.id),
        status: "PLAYED",
      },
    });

    const res = await save(activity.id, { ...CHESS, partsPerMatch: 4 });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.seriesConfigLocked);
  });

  it("takes the same setup back unchanged once a match has been played", async () => {
    const activity = await seriesTournament();
    await save(activity.id, CHESS);
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        ...sideIdData("SERIES", one.id, two.id),
        status: "PLAYED",
      },
    });

    expect((await save(activity.id, CHESS)).status).toBe(200);
  });

  it("takes the parts of a match away with the match", async () => {
    const activity = await seriesTournament();
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    const match = await prisma.match.create({
      data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
    });
    await prisma.matchPart.create({
      data: { matchId: match.id, order: 1, outcome: "SIDE_A" },
    });

    await prisma.match.delete({ where: { id: match.id } });

    expect(await prisma.matchPart.count()).toBe(0);
  });
});
