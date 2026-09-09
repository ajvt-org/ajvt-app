import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, put, del, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import { MATCH_LEVEL, ladderData, type LevelFixture } from "./ladders";

import { PUT as SAVE, GET as READ } from "@/app/api/admin/activities/[id]/levels/route";
import { POST as RECORD } from "@/app/api/admin/matches/[matchId]/moves/route";
import { DELETE as UNDO } from "@/app/api/admin/matches/[matchId]/moves/[moveId]/route";
import { POST as ADD_UNIT, GET as UNITS } from "@/app/api/admin/matches/[matchId]/units/route";

const TEYSSE = { name: "تيس", unitsToSelf: 2, unitsFromOther: 2 };

const TARGET_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, endsBy: "TARGET", unitCount: null, target: 2, unsettled: null },
  { singular: "جولة" },
];

const WON = { outcome: "SIDE_A" };

async function tournamentWithMatch() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة المريص",
      description: "بطولة",
      isTournament: true,
      matchShape: "SERIES",
      levels: ladderData(TARGET_LEVELS),
    },
  });
  const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
  });
  const unitLevel = await prisma.matchLevel.findFirstOrThrow({
    where: { activityId: activity.id, order: 1 },
  });
  return { activity, match, teysse: { ...TEYSSE, levelKey: unitLevel.id } };
}

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });

const saveConfig = (id: string, levels: object[], moves: object[]) =>
  SAVE(put(`/api/admin/activities/${id}/levels`, { levels, moves }), withId(id));
const readConfig = (id: string) =>
  READ(new Request(`http://x/a/${id}/levels`) as never, withId(id));

async function keyedLevels(activityId: string) {
  const body = await (await readConfig(activityId)).json();
  return (body.levels as { id: string }[]).map((level) => ({ ...level, key: level.id }));
}

async function declare(activityId: string, move: object) {
  const levels = await keyedLevels(activityId);
  return saveConfig(activityId, levels, [move]);
}
const record = (matchId: string, body: object) =>
  RECORD(post(`/api/admin/matches/${matchId}/moves`, body), withMatch(matchId));
const undo = (matchId: string, moveId: string) =>
  UNDO(del(`/api/admin/matches/${matchId}/moves/${moveId}`), {
    params: Promise.resolve({ matchId, moveId }),
  });
const addUnit = (matchId: string, body: object) =>
  ADD_UNIT(post(`/api/admin/matches/${matchId}/units`, body), withMatch(matchId));
const units = (matchId: string) =>
  UNITS(get(`/api/admin/matches/${matchId}/units`), withMatch(matchId));

async function unitOf(matchId: string, body: object) {
  const answer = await (await addUnit(matchId, body)).json();
  return answer.unit.id as string;
}

async function ruleOf(activityId: string, body: object) {
  const saved = await (await declare(activityId, body)).json();
  return saved.moves[0] as { id: string; name: string };
}

describe("what a tournament declares", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps the move under the game's own name", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, teysse);

    expect(res.status).toBe(200);
    expect((await res.json()).moves[0].name).toBe("تيس");
  });

  it("refuses a move with no name", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...teysse, name: "  " });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveRule.name);
  });

  it("refuses a move with no effect", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, {
      ...teysse,
      name: "لا شيء",
      unitsToSelf: 0,
      unitsFromOther: 0,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveRule.noEffect);
  });

  it("refuses the same name twice in one configuration", async () => {
    const { activity, teysse } = await tournamentWithMatch();
    const levels = await keyedLevels(activity.id);

    const res = await saveConfig(activity.id, levels, [teysse, teysse]);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(messages.moveNameTaken);
  });

  it("saves the levels and the moves in one write", async () => {
    const { activity, teysse } = await tournamentWithMatch();
    await declare(activity.id, teysse);

    expect((await (await readConfig(activity.id)).json()).moves).toHaveLength(1);

    const levels = await keyedLevels(activity.id);
    await saveConfig(activity.id, levels, []);

    expect((await (await readConfig(activity.id)).json()).moves).toEqual([]);
  });

  it("changes nothing at all when the ladder beside the move is faulty", async () => {
    const { activity, teysse } = await tournamentWithMatch();
    const levels = await keyedLevels(activity.id);

    const res = await saveConfig(
      activity.id,
      [{ ...levels[0], target: null }, levels[1]],
      [teysse],
    );

    expect(res.status).toBe(400);
    const after = await (await readConfig(activity.id)).json();
    expect(after.moves).toEqual([]);
    expect(after.levels[0].target).toBe(2);
  });
});

describe("what a match records", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("wins the match on its own, without the rest being played", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);

    const res = await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.standing.sideATotal).toBe(4);
    expect(body.standing.sideBTotal).toBe(-4);
    expect(body.standing.over).toBe(true);
    expect(body.standing.winner).toBe("SIDE_A");
  });

  it("drives the other side below nothing rather than flooring at zero", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    await addUnit(match.id, WON);
    const unitId = await unitOf(match.id, { outcome: "SIDE_B" });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.standing.sideATotal).toBe(-2);
    expect(body.standing.sideBTotal).toBe(4);
  });

  it("sits in the unit it happened in rather than in a slot of its own", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.units).toHaveLength(1);
    expect(body.units[0].outcome).toBe("SIDE_A");
    expect(body.moves[0].unitId).toBe(unitId);
  });

  it("takes one from each side and leaves them where they started", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    await prisma.matchLevel.updateMany({
      where: { activityId: activity.id, order: 0 },
      data: { target: 4 },
    });
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);
    await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.standing.sideATotal).toBe(2);
    expect(body.standing.sideBTotal).toBe(0);
    expect(body.moves).toHaveLength(2);
  });

  it("undoes one and leaves the unit it sat in alone", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);
    const recorded = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })
    ).json();

    const body = await (await undo(match.id, recorded.moves[0].id)).json();

    expect(body.moves).toEqual([]);
    expect(body.units).toHaveLength(1);
    expect(body.standing.sideATotal).toBe(2);
    expect(body.standing.over).toBe(false);
  });

  it("refuses a move the tournament never declared", async () => {
    const { match } = await tournamentWithMatch();
    const unitId = await unitOf(match.id, WON);

    expect((await record(match.id, { ruleId: "nope", side: "SIDE_A", unitId })).status).toBe(404);
  });

  it("refuses a move that names no unit", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);

    const res = await record(match.id, { ruleId: rule.id, side: "SIDE_A" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveWantsAUnit);
  });

  it("refuses a move once the match is over", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);
    await addUnit(match.id, WON);

    expect((await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId })).status).toBe(409);
  });

  it("carries what happened alongside the units", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);
    const unitId = await unitOf(match.id, WON);
    await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    const body = await (await units(match.id)).json();

    expect(body.moves).toHaveLength(1);
    expect(body.moves[0].rule.name).toBe("تيس");
    expect(body.moves[0].side).toBe("SIDE_A");
  });
});

describe("a move that says what a unit counts as", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is declared with its number rather than with a condition", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, {
      ...teysse,
      name: "أبيض",
      unitsToSelf: 0,
      unitsFromOther: 0,
      unitWorth: 2,
    });

    expect(res.status).toBe(200);
    expect((await res.json()).moves[0].unitWorth).toBe(2);
  });

  it("counts the unit it was marked on by that number", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, {
      ...teysse,
      name: "أبيض",
      unitsToSelf: 0,
      unitsFromOther: 0,
      unitWorth: 2,
    });
    const unitId = await unitOf(match.id, WON);

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId })).json();

    expect(body.standing.sideATotal).toBe(4);
    expect(body.standing.over).toBe(true);
  });

  it("leaves the unit counting one once the mark is undone", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, {
      ...teysse,
      name: "أبيض",
      unitsToSelf: 0,
      unitsFromOther: 0,
      unitWorth: 2,
    });
    const unitId = await unitOf(match.id, WON);
    const marked = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId })
    ).json();

    const body = await (await undo(match.id, marked.moves[0].id)).json();

    expect(body.standing.sideATotal).toBe(2);
    expect(body.standing.over).toBe(false);
  });

  it("refuses a number that is not a whole positive count", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...teysse, name: "أبيض", unitWorth: 0 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveRule.worth);
  });
});

describe("a move typed into the unit below the one it acts on", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  const DEEP: LevelFixture[] = [
    { ...MATCH_LEVEL, endsBy: "TARGET", unitCount: null, target: 2, unsettled: null },
    { singular: "فكتوار", countedBy: "POINTS", endsBy: "TARGET", target: 100 },
    { singular: "جولة" },
  ];

  async function deepMatch() {
    const activity = await prisma.activity.create({
      data: {
        title: "بطولة",
        description: "بطولة",
        isTournament: true,
        matchShape: "SERIES",
        levels: ladderData(DEEP),
      },
    });
    const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    const match = await prisma.match.create({
      data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
    });
    const levels = await prisma.matchLevel.findMany({
      where: { activityId: activity.id },
      orderBy: { order: "asc" },
    });
    return { activity, match, levels };
  }

  it("abandons the unit it was typed into and records against the one it acts on", async () => {
    const { activity, match, levels } = await deepMatch();
    const rule = await ruleOf(activity.id, {
      ...TEYSSE,
      levelKey: levels[1].id,
      endsUnit: true,
    });
    const parent = await unitOf(match.id, WON);
    const child = await unitOf(match.id, { parentId: parent, sideAPoints: 30, sideBPoints: 10 });

    const body = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId: child })
    ).json();

    expect(body.moves[0].unitId).toBe(parent);
    expect(body.units[0].children[0].abandoned).toBe(true);
    expect(body.units[0].endedBy.name).toBe("تيس");
  });

  it("leaves the unit alone where the move was typed into the one it acts on", async () => {
    const { activity, match, levels } = await deepMatch();
    const rule = await ruleOf(activity.id, { ...TEYSSE, levelKey: levels[1].id });
    const parent = await unitOf(match.id, WON);
    const child = await unitOf(match.id, { parentId: parent, sideAPoints: 30, sideBPoints: 10 });

    const body = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId: parent })
    ).json();

    expect(body.moves[0].unitId).toBe(parent);
    expect(body.units[0].children[0].abandoned).toBe(false);
    expect(child).toBeDefined();
  });

  it("moves the level above the unit it acts on", async () => {
    const { activity, match, levels } = await deepMatch();
    const rule = await ruleOf(activity.id, { ...TEYSSE, levelKey: levels[1].id });
    const parent = await unitOf(match.id, WON);

    const body = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId: parent })
    ).json();

    expect(body.standing.sideBTotal).toBe(4);
    expect(body.standing.sideATotal).toBe(-4);
  });
});

describe("a move that names its own level", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function levelsOf(activityId: string) {
    return prisma.matchLevel.findMany({ where: { activityId }, orderBy: { order: "asc" } });
  }

  it("is refused on a unit at another level", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const levels = await levelsOf(activity.id);
    const rule = await ruleOf(activity.id, {
      ...teysse,
      levelKey: levels[0].id,
      endsUnit: true,
    });
    const answer = await (await addUnit(match.id, WON)).json();

    const res = await record(match.id, {
      ruleId: rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveWantsItsOwnLevel);
  });

  it("is taken on a unit at the level it names", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const levels = await levelsOf(activity.id);
    const rule = await ruleOf(activity.id, { ...teysse, levelKey: levels[1].id });
    const answer = await (await addUnit(match.id, WON)).json();

    const res = await record(match.id, {
      ruleId: rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(201);
  });

  it("is refused for a level the configuration does not have", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...teysse, levelKey: "nope" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveRule.level);
  });
});
