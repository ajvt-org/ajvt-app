import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as SAVE } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, makeMember } from "./helpers";

function withMatch(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

async function football(isKnockout = false) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة الأهداف", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players: { id: string }[] = [];
  for (let i = 0; i < 2; i++) {
    const member = await makeMember({
      fullName: `لاعب ${i}`,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.teamMember.create({
      data: { teamId: i === 0 ? home.id : away.id, memberId: member.id, status: "ACTIVE" },
    });
    players.push(member);
  }
  const match = await prisma.match.create({
    data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id, isKnockout },
  });
  return { activity, home, away, players, match };
}

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

describe("goal events", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("derives the score from the events, own goal included", async () => {
    const { home, away, players, match } = await football();

    const res = await save(match.id, {
      goalEvents: [
        { teamId: home.id, memberId: players[0].id, minute: 10 },
        { teamId: home.id, memberId: players[1].id, kind: "OWN_GOAL", minute: 40 },
        { teamId: away.id, memberId: null, kind: "PENALTY" },
      ],
    });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 2, awayScore: 1, status: "PLAYED" });
    const unknown = await prisma.matchGoal.findFirstOrThrow({ where: { kind: "PENALTY" } });
    expect(unknown.memberId).toBeNull();
  });

  it("refuses an own goal scored by the credited team", async () => {
    const { home, players, match } = await football();

    const res = await save(match.id, {
      goalEvents: [{ teamId: home.id, memberId: players[0].id, kind: "OWN_GOAL" }],
    });

    expect(res.status).toBe(400);
  });

  it("refuses a normal goal by a player of the other team", async () => {
    const { home, players, match } = await football();

    const res = await save(match.id, {
      goalEvents: [{ teamId: home.id, memberId: players[1].id }],
    });

    expect(res.status).toBe(400);
  });

  it("keeps extra time goals in the final score", async () => {
    const { home, players, match } = await football();

    await save(match.id, {
      goalEvents: [{ teamId: home.id, memberId: players[0].id, period: "EXTRA_TIME", minute: 100 }],
    });

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 1, awayScore: 0 });
  });

  it("derives the shootout from the kicks on a tied knockout match", async () => {
    const { home, away, players, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [],
      penaltyKicks: [
        { teamId: home.id, memberId: players[0].id, scored: true },
        { teamId: away.id, memberId: players[1].id, scored: false },
        { teamId: home.id, memberId: null, scored: true },
        { teamId: away.id, memberId: null, scored: true },
      ],
    });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homePenalties: 2, awayPenalties: 1 });
    expect(await prisma.matchPenaltyKick.count({ where: { matchId: match.id } })).toBe(4);
  });

  it("takes the shootout away with the result it belonged to", async () => {
    const { home, away, players, match } = await football(true);
    await save(match.id, {
      goalEvents: [],
      penaltyKicks: [
        { teamId: home.id, memberId: players[0].id, scored: true },
        { teamId: away.id, memberId: players[1].id, scored: false },
      ],
    });

    await save(match.id, { homeScore: null, awayScore: null });

    const cleared = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(cleared).toMatchObject({
      homeScore: null,
      awayScore: null,
      homePenalties: null,
      awayPenalties: null,
      status: "SCHEDULED",
    });
    expect(await prisma.matchPenaltyKick.count({ where: { matchId: match.id } })).toBe(0);
    expect(await prisma.matchGoal.count({ where: { matchId: match.id } })).toBe(0);
  });

  it("refuses a shootout that ends level or on a league match", async () => {
    const knockout = await football(true);
    const level = await save(knockout.match.id, {
      goalEvents: [],
      penaltyKicks: [
        { teamId: knockout.home.id, memberId: null, scored: true },
        { teamId: knockout.away.id, memberId: null, scored: true },
      ],
    });
    expect(level.status).toBe(400);

    const league = await football();
    const res = await save(league.match.id, {
      goalEvents: [],
      penaltyKicks: [{ teamId: league.home.id, memberId: null, scored: true }],
    });
    expect(res.status).toBe(400);
  });

  it("replaces the events wholesale on a resave", async () => {
    const { home, away, players, match } = await football();
    await save(match.id, {
      goalEvents: [
        { teamId: home.id, memberId: players[0].id },
        { teamId: home.id, memberId: null },
      ],
    });

    await save(match.id, { goalEvents: [{ teamId: away.id, memberId: players[1].id }] });

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 0, awayScore: 1 });
    expect(await prisma.matchGoal.count({ where: { matchId: match.id } })).toBe(1);
  });

  it("names no man of the match when the save carries none", async () => {
    const { home, players, match } = await football();

    await save(match.id, {
      goalEvents: [
        { teamId: home.id, memberId: players[0].id, kind: "GOAL", period: "REGULAR", minute: 10 },
      ],
      manOfTheMatchId: null,
    });

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBeNull();
  });

  it("leaves the man of the match alone when the field is absent", async () => {
    const { home, players, match } = await football();
    await prisma.match.update({
      where: { id: match.id },
      data: { manOfTheMatchId: players[1].id },
    });

    await save(match.id, {
      goalEvents: [
        { teamId: home.id, memberId: players[0].id, kind: "GOAL", period: "REGULAR", minute: 10 },
      ],
    });

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBe(players[1].id);
  });

  it("clears the man of the match when the save says none", async () => {
    const { home, players, match } = await football();
    await prisma.match.update({
      where: { id: match.id },
      data: { manOfTheMatchId: players[0].id },
    });

    await save(match.id, {
      goalEvents: [
        { teamId: home.id, memberId: players[0].id, kind: "GOAL", period: "REGULAR", minute: 10 },
      ],
      manOfTheMatchId: null,
    });

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBeNull();
  });
});
