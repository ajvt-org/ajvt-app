import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, del, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import { MATCH_LEVEL, ladderData, type LevelFixture } from "./ladders";

import { GET as LIST_RULES, POST as DECLARE } from "@/app/api/admin/activities/[id]/moves/route";
import { DELETE as WITHDRAW } from "@/app/api/admin/activities/[id]/moves/[ruleId]/route";
import { POST as RECORD } from "@/app/api/admin/matches/[matchId]/moves/route";
import { DELETE as UNDO } from "@/app/api/admin/matches/[matchId]/moves/[moveId]/route";
import { POST as ADD_UNIT, GET as UNITS } from "@/app/api/admin/matches/[matchId]/units/route";

const TEYSSE = { name: "تيس", unitsToSelf: 2, unitsFromOther: 2 };

const TARGET_LEVELS: LevelFixture[] = [
  { ...MATCH_LEVEL, endsBy: "TARGET", unitCount: null, target: 2, unsettled: null },
  { singular: "جولة", plural: "جولات" },
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
  return { activity, match, teysse: { ...TEYSSE, levelId: unitLevel.id } };
}

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });

const declare = (id: string, body: object) =>
  DECLARE(post(`/api/admin/activities/${id}/moves`, body), withId(id));
const listRules = (id: string) => LIST_RULES(get(`/api/admin/activities/${id}/moves`), withId(id));
const withdraw = (id: string, ruleId: string) =>
  WITHDRAW(del(`/api/admin/activities/${id}/moves/${ruleId}`), {
    params: Promise.resolve({ id, ruleId }),
  });
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

async function ruleOf(activityId: string, body: object) {
  return (await (await declare(activityId, body)).json()).rule as { id: string; name: string };
}

describe("what a tournament declares", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps the move under the game's own name", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, teysse);

    expect(res.status).toBe(201);
    expect((await res.json()).rule.name).toBe("تيس");
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

  it("refuses the same name twice", async () => {
    const { activity, teysse } = await tournamentWithMatch();
    await declare(activity.id, teysse);

    expect((await declare(activity.id, teysse)).status).toBe(409);
  });

  it("lists and withdraws what it declared", async () => {
    const { activity, teysse } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id, teysse);

    expect((await (await listRules(activity.id)).json()).rules).toHaveLength(1);
    expect((await withdraw(activity.id, rule.id)).status).toBe(200);
    expect((await (await listRules(activity.id)).json()).rules).toEqual([]);
  });
});

describe("what a match records", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function unitOf(matchId: string, body: object) {
    const answer = await (await addUnit(matchId, body)).json();
    return answer.unit.id as string;
  }

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
    const rule = await (
      await declare(activity.id, { ...teysse, levelId: levels[0].id, endsUnit: true })
    ).json();
    const answer = await (await addUnit(match.id, WON)).json();

    const res = await record(match.id, {
      ruleId: rule.rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveWantsItsOwnLevel);
  });

  it("is taken on a unit at the level it names", async () => {
    const { activity, match, teysse } = await tournamentWithMatch();
    const levels = await levelsOf(activity.id);
    const rule = await (await declare(activity.id, { ...teysse, levelId: levels[1].id })).json();
    const answer = await (await addUnit(match.id, WON)).json();

    const res = await record(match.id, {
      ruleId: rule.rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(201);
  });

  it("is refused for a level the tournament does not have", async () => {
    const { activity, teysse } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...teysse, levelId: "nope" });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(messages.levelNotInTournament);
  });
});
