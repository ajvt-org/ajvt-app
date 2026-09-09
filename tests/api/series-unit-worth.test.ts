import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, del, createAdmin, signInAsAdmin } from "./helpers";
import { sideIdData } from "@/lib/matchSides";
import { ladderData, type LevelFixture } from "./ladders";

import { GET as LIST, POST as ADD } from "@/app/api/admin/matches/[matchId]/units/route";
import { PATCH as KEEP } from "@/app/api/admin/matches/[matchId]/units/[unitId]/worth/route";
import {
  PATCH as CORRECT,
  DELETE as REMOVE,
} from "@/app/api/admin/matches/[matchId]/units/[unitId]/route";

const CARDS: LevelFixture[] = [
  {
    singular: "المباراة",
    countedBy: "OUTCOME",
    endsBy: "COUNT",
    unitCount: 2,
    unsettled: "DRAW",
  },
  { singular: "شوط", countedBy: "POINTS", endsBy: "TARGET", target: 10 },
  { singular: "جولة" },
];

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

async function tournament(when: "LOSER_ON_NOTHING" | "WINNER_LOST_CREDIT", worth = 2) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      matchShape: "SERIES",
      levels: ladderData(CARDS),
    },
  });
  const levels = await prisma.matchLevel.findMany({
    where: { activityId: activity.id },
    orderBy: { order: "asc" },
  });
  const rule = await prisma.worthRule.create({
    data: { activityId: activity.id, levelId: levels[1].id, name: "قاعدة", when, worth },
  });
  const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
  });
  return { activity, match, rule, levels };
}

async function setWon(matchId: string, rounds: [number, number][]) {
  const set = await (await add(matchId, { outcome: "SIDE_A" })).json();
  for (const [a, b] of rounds) {
    await add(matchId, { parentId: set.unit.id, sideAPoints: a, sideBPoints: b });
  }
  return set.unit.id as string;
}

describe("a unit a level says is worth more", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("counts for the declared number where the loser was on nothing as the last unit began", async () => {
    const { match, rule } = await tournament("LOSER_ON_NOTHING");

    const set = await setWon(match.id, [
      [5, 0],
      [5, 3],
    ]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBe(rule.id);
    expect(stored?.worth).toBe(2);
  });

  it("reads the tally before the closing unit rather than the final standing", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");

    const set = await setWon(match.id, [
      [5, 1],
      [5, 0],
    ]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBeNull();
    expect(stored?.worth).toBeNull();
  });

  it("moves the total of the level above it", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");

    await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);

    const { standing } = await (await list(match.id)).json();
    expect(standing.sideATotal).toBe(4);
  });

  it("lets go of a rule once the score it was read from is corrected", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);
    const rounds = await prisma.matchUnit.findMany({ where: { parentId: set } });

    await correct(match.id, rounds[0].id, { sideAPoints: 5, sideBPoints: 2 });

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBeNull();
    expect(stored?.worth).toBeNull();
  });

  it("lets go of it again once a unit is removed", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);
    const rounds = await prisma.matchUnit.findMany({ where: { parentId: set } });

    await remove(match.id, rounds[1].id);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBeNull();
  });

  it("says nothing about a unit while it is still being played", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");

    const set = await setWon(match.id, [[5, 0]]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBeNull();
  });

  it("takes no rule that was declared for another level", async () => {
    const { match, activity, levels } = await tournament("LOSER_ON_NOTHING");
    await prisma.worthRule.updateMany({
      where: { activityId: activity.id },
      data: { levelId: levels[0].id },
    });

    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);

    expect((await prisma.matchUnit.findUnique({ where: { id: set } }))?.worthRuleId).toBeNull();
  });
});

describe("a unit the winner took after losing its starting credit", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function credited() {
    const made = await tournament("WINNER_LOST_CREDIT", 3);
    await prisma.matchLevel.update({
      where: { id: made.levels[1].id },
      data: { startingCredit: 4, creditWindow: 2 },
    });
    return made;
  }

  it("counts for the declared number where the winner is the side that lost it", async () => {
    const { match, rule } = await credited();

    const set = await setWon(match.id, [
      [0, 1],
      [0, 1],
      [12, 0],
    ]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBe(rule.id);
    expect(stored?.worth).toBe(3);
  });

  it("says nothing where the side that lost it is the side that lost the unit", async () => {
    const { match } = await credited();

    const set = await setWon(match.id, [
      [0, 1],
      [0, 1],
      [0, 12],
    ]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthRuleId).toBeNull();
  });
});

describe("an admin who says a detected rule does not apply", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  const keep = (matchId: string, unitId: string, kept: boolean) =>
    KEEP(
      patch(`/api/admin/matches/${matchId}/units/${unitId}/worth`, { kept }),
      withUnit(matchId, unitId),
    );

  it("turns it off for that unit and takes the number back", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);

    expect((await keep(match.id, set, false)).status).toBe(200);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthKept).toBe(false);
    expect(stored?.worth).toBeNull();
    expect(stored?.worthRuleId).not.toBeNull();
  });

  it("leaves it off while the scores are corrected around it", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);
    await keep(match.id, set, false);
    const rounds = await prisma.matchUnit.findMany({ where: { parentId: set } });

    await correct(match.id, rounds[0].id, { sideAPoints: 6, sideBPoints: 0 });

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthKept).toBe(false);
    expect(stored?.worth).toBeNull();
  });

  it("puts it back where the admin says so", async () => {
    const { match, rule } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);
    await keep(match.id, set, false);

    await keep(match.id, set, true);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worthKept).toBe(true);
    expect(stored?.worth).toBe(2);
    expect(stored?.worthRuleId).toBe(rule.id);
  });

  it("refuses anything that is not on or off", async () => {
    const { match } = await tournament("LOSER_ON_NOTHING");
    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);

    const res = await KEEP(
      patch(`/api/admin/matches/${match.id}/units/${set}/worth`, { kept: "no" }),
      withUnit(match.id, set),
    );

    expect(res.status).toBe(400);
  });
});

describe("a tournament that declares no such rule", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("records what it always recorded", async () => {
    const activity = await prisma.activity.create({
      data: {
        title: "بطولة",
        description: "بطولة",
        isTournament: true,
        matchShape: "SERIES",
        levels: ladderData(CARDS),
      },
    });
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    const match = await prisma.match.create({
      data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
    });

    const set = await setWon(match.id, [
      [5, 0],
      [5, 0],
    ]);

    const stored = await prisma.matchUnit.findUnique({ where: { id: set } });
    expect(stored?.worth).toBeNull();
    expect(stored?.worthRuleId).toBeNull();
    const { standing } = await (await list(match.id)).json();
    expect(standing.sideATotal).toBe(2);
  });
});
