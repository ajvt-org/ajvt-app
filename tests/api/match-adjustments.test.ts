import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, del, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";
import { SCORED_LEVELS, ladderData } from "./ladders";

import {
  GET as LIST_RULES,
  POST as DECLARE,
} from "@/app/api/admin/activities/[id]/adjustment-rules/route";
import { DELETE as WITHDRAW } from "@/app/api/admin/activities/[id]/adjustment-rules/[ruleId]/route";
import { POST as RECORD } from "@/app/api/admin/matches/[matchId]/adjustments/route";
import { DELETE as UNDO } from "@/app/api/admin/matches/[matchId]/adjustments/[adjustmentId]/route";
import { POST as ADD_UNIT, GET as UNITS } from "@/app/api/admin/matches/[matchId]/units/route";

const TEYSSE = { name: "تيس", unitsToSelf: 2, unitsFromOther: 2 };

async function tournamentWithMatch() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة المريص",
      description: "بطولة",
      isTournament: true,
      matchShape: "SERIES",
      levels: ladderData(SCORED_LEVELS),
    },
  });
  const one = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const two = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId: activity.id, ...sideIdData("SERIES", one.id, two.id) },
  });
  return { activity, match };
}

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });

const declare = (id: string, body: object) =>
  DECLARE(post(`/api/admin/activities/${id}/adjustment-rules`, body), withId(id));
const listRules = (id: string) =>
  LIST_RULES(get(`/api/admin/activities/${id}/adjustment-rules`), withId(id));
const withdraw = (id: string, ruleId: string) =>
  WITHDRAW(del(`/api/admin/activities/${id}/adjustment-rules/${ruleId}`), {
    params: Promise.resolve({ id, ruleId }),
  });
const record = (matchId: string, body: object) =>
  RECORD(post(`/api/admin/matches/${matchId}/adjustments`, body), withMatch(matchId));
const undo = (matchId: string, adjustmentId: string) =>
  UNDO(del(`/api/admin/matches/${matchId}/adjustments/${adjustmentId}`), {
    params: Promise.resolve({ matchId, adjustmentId }),
  });
const addUnit = (matchId: string, body: object) =>
  ADD_UNIT(post(`/api/admin/matches/${matchId}/units`, body), withMatch(matchId));
const units = (matchId: string) =>
  UNITS(get(`/api/admin/matches/${matchId}/units`), withMatch(matchId));

async function ruleOf(activityId: string) {
  return (await (await declare(activityId, TEYSSE)).json()).rule as { id: string; name: string };
}

describe("what a tournament declares", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps the move under the game's own name", async () => {
    const { activity } = await tournamentWithMatch();

    const res = await declare(activity.id, TEYSSE);

    expect(res.status).toBe(201);
    expect((await res.json()).rule.name).toBe("تيس");
  });

  it("refuses a move with no name", async () => {
    const { activity } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...TEYSSE, name: "  " });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.adjustmentRule.name);
  });

  it("refuses a move with no effect", async () => {
    const { activity } = await tournamentWithMatch();

    const res = await declare(activity.id, { name: "لا شيء", unitsToSelf: 0, unitsFromOther: 0 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.adjustmentRule.noEffect);
  });

  it("refuses the same name twice", async () => {
    const { activity } = await tournamentWithMatch();
    await declare(activity.id, TEYSSE);

    expect((await declare(activity.id, TEYSSE)).status).toBe(409);
  });

  it("lists and withdraws what it declared", async () => {
    const { activity } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);

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
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });

    const res = await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.standing.sideATotal).toBe(4);
    expect(body.standing.sideBTotal).toBe(-4);
    expect(body.standing.over).toBe(true);
    expect(body.standing.winner).toBe("SIDE_A");
  });

  it("drives the other side below nothing rather than flooring at zero", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addUnit(match.id, { sideAPoints: 101, sideBPoints: 40 });
    const unitId = await unitOf(match.id, { sideAPoints: 20, sideBPoints: 101 });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.standing.sideATotal).toBe(-2);
    expect(body.standing.sideBTotal).toBe(4);
  });

  it("sits in the unit it happened in rather than in a slot of its own", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.units).toHaveLength(1);
    expect(body.units[0].sideAPoints).toBe(101);
    expect(body.adjustments[0].unitId).toBe(unitId);
  });

  it("takes one from each side and leaves them where they started", async () => {
    const { activity, match } = await tournamentWithMatch();
    await prisma.matchLevel.updateMany({
      where: { activityId: activity.id, order: 0 },
      data: { unitsPerParent: 5, unitsToWin: 4 },
    });
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });
    await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })).json();

    expect(body.standing.sideATotal).toBe(2);
    expect(body.standing.sideBTotal).toBe(0);
    expect(body.adjustments).toHaveLength(2);
  });

  it("undoes one and leaves the unit it sat in alone", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });
    const recorded = await (
      await record(match.id, { ruleId: rule.id, side: "SIDE_B", unitId })
    ).json();

    const body = await (await undo(match.id, recorded.adjustments[0].id)).json();

    expect(body.adjustments).toEqual([]);
    expect(body.units).toHaveLength(1);
    expect(body.standing.sideATotal).toBe(2);
    expect(body.standing.over).toBe(false);
  });

  it("refuses a move the tournament never declared", async () => {
    const { match } = await tournamentWithMatch();
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });

    expect((await record(match.id, { ruleId: "nope", side: "SIDE_A", unitId })).status).toBe(404);
  });

  it("refuses a move that names no unit", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);

    const res = await record(match.id, { ruleId: rule.id, side: "SIDE_A" });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.adjustmentWantsAUnit);
  });

  it("refuses a move once the match is over", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });
    await addUnit(match.id, { sideAPoints: 101, sideBPoints: 40 });

    expect((await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId })).status).toBe(409);
  });

  it("carries what happened alongside the units", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const unitId = await unitOf(match.id, { sideAPoints: 101, sideBPoints: 40 });
    await record(match.id, { ruleId: rule.id, side: "SIDE_A", unitId });

    const body = await (await units(match.id)).json();

    expect(body.adjustments).toHaveLength(1);
    expect(body.adjustments[0].rule.name).toBe("تيس");
    expect(body.adjustments[0].side).toBe("SIDE_A");
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
    const { activity, match } = await tournamentWithMatch();
    const levels = await levelsOf(activity.id);
    const rule = await (
      await declare(activity.id, { ...TEYSSE, levelId: levels[0].id, endsUnit: true })
    ).json();
    const answer = await (await addUnit(match.id, { sideAPoints: 101, sideBPoints: 40 })).json();

    const res = await record(match.id, {
      ruleId: rule.rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.moveWantsItsOwnLevel);
  });

  it("is taken on a unit at the level it names", async () => {
    const { activity, match } = await tournamentWithMatch();
    const levels = await levelsOf(activity.id);
    const rule = await (await declare(activity.id, { ...TEYSSE, levelId: levels[1].id })).json();
    const answer = await (await addUnit(match.id, { sideAPoints: 101, sideBPoints: 40 })).json();

    const res = await record(match.id, {
      ruleId: rule.rule.id,
      side: "SIDE_A",
      unitId: answer.unit.id,
    });

    expect(res.status).toBe(201);
  });

  it("is refused for a level the tournament does not have", async () => {
    const { activity } = await tournamentWithMatch();

    const res = await declare(activity.id, { ...TEYSSE, levelId: "nope" });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(messages.levelNotInTournament);
  });
});
