import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { getStandings } from "@/lib/quizRankingServer";
import { attemptsOf, attemptsInRound } from "@/lib/quizBreakdownServer";
import { myCompetitions } from "@/lib/competitionServer";
import { NOTHING_TO_VOID } from "@/lib/quizAttemptServer";
import { resetDb, post, createUsers, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as VOID_ONE } from "@/app/api/admin/quiz/attempts/[id]/void/route";
import { POST as VOID_ALL } from "@/app/api/admin/quiz/competitions/[id]/void/route";

const START = new Date("2026-08-01T08:00:00.000Z");
const PERIOD = 1440 * 60_000;
const AT = new Date(START.getTime() + PERIOD + 1000);

async function competition() {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 5,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
}

async function attempt(competitionId: string, userId: string, index: number, score: number) {
  const opensAt = new Date(START.getTime() + index * PERIOD);
  const round =
    (await prisma.quizRound.findUnique({
      where: { competitionId_index: { competitionId, index } },
    })) ??
    (await prisma.quizRound.create({
      data: { competitionId, index, opensAt, closesAt: new Date(opensAt.getTime() + PERIOD) },
    }));
  return prisma.quizAttempt.create({
    data: { roundId: round.id, userId, score, finishedAt: new Date(opensAt.getTime() + 60_000) },
  });
}

async function member(userId: string, fullName: string) {
  return prisma.member.create({
    data: {
      userId,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
}

const voidOne = (id: string, voided: boolean) =>
  VOID_ONE(post(`/api/admin/quiz/attempts/${id}/void`, { voided }), withId(id));

const voidAll = (id: string, userId: string, voided: boolean) =>
  VOID_ALL(post(`/api/admin/quiz/competitions/${id}/void`, { userId, voided }), withId(id));

describe("voiding what a member scored", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("takes the round out of the ranking without touching the points", async () => {
    const c = await competition();
    const [cheat, honest] = await createUsers(2);
    await member(cheat.id, "غشاش");
    await member(honest.id, "نزيه");
    const round = await attempt(c.id, cheat.id, 1, 90);
    await attempt(c.id, honest.id, 1, 40);

    await voidOne(round.id, true);

    const board = (await getStandings(c.id, honest.id, 10, AT)).boards[0];
    expect(board.rows.map((r) => [r.name, r.total])).toEqual([
      ["نزيه", 40],
      ["غشاش", 0],
    ]);
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id: round.id } })).score).toBe(
      90,
    );
  });

  it("puts the round back when the admin restores it", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    await member(cheat.id, "غشاش");
    const round = await attempt(c.id, cheat.id, 1, 90);
    await voidOne(round.id, true);

    await voidOne(round.id, false);

    expect((await getStandings(c.id, cheat.id, 10, AT)).boards[0].rows[0].total).toBe(90);
  });

  it("clears every round of a competition at once", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    await member(cheat.id, "غشاش");
    await attempt(c.id, cheat.id, 0, 30);
    await attempt(c.id, cheat.id, 1, 90);

    const res = await voidAll(c.id, cheat.id, true);

    expect((await res.json()).rounds).toBe(2);
    const general = (await getStandings(c.id, cheat.id, 10, AT)).boards.find((b) => b.wholeRun);
    expect(general?.rows[0].total).toBe(0);
  });

  it("says so when the member has no attempt in the competition", async () => {
    const c = await competition();
    const [nobody] = await createUsers(1);

    const res = await voidAll(c.id, nobody.id, true);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(NOTHING_TO_VOID);
  });

  it("shows the member their round as void rather than as points", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    await member(cheat.id, "غشاش");
    const round = await attempt(c.id, cheat.id, 1, 90);
    await voidOne(round.id, true);

    const rounds = await attemptsOf(c.id, cheat.id, AT);
    const voided = rounds.find((r) => r.round === 1);

    expect(voided?.voided).toBe(true);
    expect(voided?.score).toBe(0);
  });

  it("says nothing of the round to a member whose score stands", async () => {
    const c = await competition();
    const [honest] = await createUsers(1);
    await member(honest.id, "نزيه");
    await attempt(c.id, honest.id, 1, 40);

    const rounds = await attemptsOf(c.id, honest.id, AT);

    expect(rounds.find((r) => r.round === 1)?.voided).toBe(false);
  });

  it("is closed to an admin who is not SUPER", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    const round = await attempt(c.id, cheat.id, 1, 90);
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));

    expect((await voidOne(round.id, true)).status).toBe(403);
    expect((await voidAll(c.id, cheat.id, true)).status).toBe(403);
  });

  it("writes the decision to the audit log", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    const round = await attempt(c.id, cheat.id, 1, 90);

    await voidOne(round.id, true);
    await voidOne(round.id, false);

    const actions = (await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map(
      (row) => row.action,
    );
    expect(actions).toContain("VOID_QUIZ_SCORE");
    expect(actions).toContain("RESTORE_QUIZ_SCORE");
  });

  it("drops the voided points from the score on the quiz list", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    await member(cheat.id, "غشاش");
    await attempt(c.id, cheat.id, 0, 30);
    const second = await attempt(c.id, cheat.id, 1, 90);

    await voidOne(second.id, true);

    const mine = (await myCompetitions(cheat.id)).find((row) => row.competition.id === c.id);
    expect(mine?.mine.reduce((sum, a) => sum + a.score, 0)).toBe(30);
  });

  it("orders the admin list by the score it shows", async () => {
    const c = await competition();
    const [cheat, honest] = await createUsers(2);
    await member(cheat.id, "غشاش");
    await member(honest.id, "نزيه");
    const big = await attempt(c.id, cheat.id, 1, 90);
    await attempt(c.id, honest.id, 1, 40);

    await voidOne(big.id, true);

    const rows = await attemptsInRound(c.id, 1);
    expect(rows.map((r) => [r.name, r.score])).toEqual([
      ["نزيه", 40],
      ["غشاش", 0],
    ]);
  });

  it("marks the round void in the answers a member reads back", async () => {
    const c = await competition();
    const [cheat] = await createUsers(1);
    await member(cheat.id, "غشاش");
    const round = await attempt(c.id, cheat.id, 1, 90);

    await voidOne(round.id, true);

    const { attemptDetail } = await import("@/lib/quizBreakdownServer");
    expect((await attemptDetail(round.id)).voided).toBe(true);
  });
});
