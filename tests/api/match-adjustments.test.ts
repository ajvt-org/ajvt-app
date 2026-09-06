import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, del, createAdmin, signInAsAdmin, withId } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";

import {
  GET as LIST_RULES,
  POST as DECLARE,
} from "@/app/api/admin/activities/[id]/adjustment-rules/route";
import { DELETE as WITHDRAW } from "@/app/api/admin/activities/[id]/adjustment-rules/[ruleId]/route";
import { POST as RECORD } from "@/app/api/admin/matches/[matchId]/adjustments/route";
import { DELETE as UNDO } from "@/app/api/admin/matches/[matchId]/adjustments/[adjustmentId]/route";
import { POST as ADD_PART, GET as PARTS } from "@/app/api/admin/matches/[matchId]/parts/route";

const MARYASS = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO" as const,
  partsToWin: 2,
  partDecision: "POINTS" as const,
  partTarget: 100,
  partWord: "جولة",
  partsWord: "جولات",
};

const TEYSSE = { name: "تيس", partsToSelf: 2, partsFromOther: 2 };

async function tournamentWithMatch() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة المريص",
      description: "بطولة",
      isTournament: true,
      matchShape: "SERIES",
      ...MARYASS,
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
const addPart = (matchId: string, body: object) =>
  ADD_PART(post(`/api/admin/matches/${matchId}/parts`, body), withMatch(matchId));
const parts = (matchId: string) =>
  PARTS(get(`/api/admin/matches/${matchId}/parts`), withMatch(matchId));

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

    const res = await declare(activity.id, { name: "لا شيء", partsToSelf: 0, partsFromOther: 0 });

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

  it("wins the match on its own, without the rest being played", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);

    const res = await record(match.id, { ruleId: rule.id, side: "SIDE_A" });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.standing.sideAHalves).toBe(4);
    expect(body.standing.sideBHalves).toBe(-4);
    expect(body.standing.over).toBe(true);
    expect(body.standing.winner).toBe("SIDE_A");
  });

  it("drives the other side below nothing rather than flooring at zero", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B" })).json();

    expect(body.standing.sideAHalves).toBe(-2);
    expect(body.standing.sideBHalves).toBe(4);
  });

  it("ends the part being played and leaves it scoring nothing", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B" })).json();

    expect(body.parts).toHaveLength(2);
    expect(body.parts[0].abandoned).toBe(false);
    expect(body.parts[1].abandoned).toBe(true);
    expect(body.parts[1].sideAPoints).toBeNull();
  });

  it("leaves a part that was already finished alone", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B" })).json();

    expect(body.parts[0].sideAPoints).toBe(101);
  });

  it("takes one from each side and leaves them where they started", async () => {
    const { activity, match } = await tournamentWithMatch();
    await prisma.activity.update({
      where: { id: activity.id },
      data: { partsPerMatch: 5, partsToWin: 4 },
    });
    const rule = await ruleOf(activity.id);
    await record(match.id, { ruleId: rule.id, side: "SIDE_A" });

    const body = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B" })).json();

    expect(body.standing.sideAHalves).toBe(0);
    expect(body.standing.sideBHalves).toBe(0);
    expect(body.adjustments).toHaveLength(2);
  });

  it("undoes one and restores the part it ended", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    const recorded = await (await record(match.id, { ruleId: rule.id, side: "SIDE_A" })).json();

    const body = await (await undo(match.id, recorded.adjustments[0].id)).json();

    expect(body.adjustments).toEqual([]);
    expect(body.standing.sideAHalves).toBe(0);
    expect(body.standing.over).toBe(false);
  });

  it("leaves a part that was already played where it was when the move is undone", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });
    const recorded = await (await record(match.id, { ruleId: rule.id, side: "SIDE_B" })).json();

    const body = await (await undo(match.id, recorded.adjustments[0].id)).json();

    expect(body.parts).toHaveLength(1);
    expect(body.adjustments).toEqual([]);
  });

  it("refuses a move the tournament never declared", async () => {
    const { match } = await tournamentWithMatch();

    expect((await record(match.id, { ruleId: "nope", side: "SIDE_A" })).status).toBe(404);
  });

  it("refuses a move once the match is over", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });
    await addPart(match.id, { sideAPoints: 101, sideBPoints: 40 });

    expect((await record(match.id, { ruleId: rule.id, side: "SIDE_A" })).status).toBe(409);
  });

  it("carries what happened alongside the parts", async () => {
    const { activity, match } = await tournamentWithMatch();
    const rule = await ruleOf(activity.id);
    await record(match.id, { ruleId: rule.id, side: "SIDE_A" });

    const body = await (await parts(match.id)).json();

    expect(body.adjustments).toHaveLength(1);
    expect(body.adjustments[0].rule.name).toBe("تيس");
    expect(body.adjustments[0].side).toBe("SIDE_A");
  });
});
