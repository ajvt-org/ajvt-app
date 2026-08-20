import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { boardRanking, type BoardShape, type RoundScore } from "@/lib/quizRanking";
import { rankBoard } from "@/lib/quizRankingSql";
import { resetDb, createUsers } from "./helpers";

const START = new Date("2026-08-01T08:00:00.000Z");
const PERIOD = 1440 * 60_000;

const SHAPES: { name: string; board: BoardShape }[] = [
  { name: "the round board", board: { blockRounds: 1, counting: 1, wholeRun: false } },
  { name: "the week board", board: { blockRounds: 7, counting: 6, wholeRun: false } },
  { name: "the whole run board", board: { blockRounds: 1, counting: 1, wholeRun: true } },
  { name: "a board counting nothing", board: { blockRounds: 4, counting: 0, wholeRun: false } },
];

async function competition() {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 20,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
}

async function history(competitionId: string, userIds: string[]): Promise<RoundScore[]> {
  const scores: RoundScore[] = [];
  for (let index = 0; index < 10; index++) {
    const opensAt = new Date(START.getTime() + index * PERIOD);
    const round = await prisma.quizRound.create({
      data: {
        competitionId,
        index,
        opensAt,
        closesAt: new Date(opensAt.getTime() + PERIOD),
      },
    });
    for (const [i, userId] of userIds.entries()) {
      if ((i + index) % 4 === 0) continue;
      const score = ((i * 13 + index * 7) % 37) + index;
      const finishedAt =
        (i + index) % 5 === 0 ? null : new Date(opensAt.getTime() + (i * 60 + index) * 1000);
      await prisma.quizAttempt.create({
        data: { roundId: round.id, userId, score, finishedAt },
      });
      scores.push({ userId, index, score, finishedAt });
    }
  }
  return scores;
}

describe("ranking a board in the database", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it.each(SHAPES.map((s) => [s.name, s.board] as const))(
    "matches what the pure ranking says for %s",
    async (_name, board) => {
      const c = await competition();
      const users = await createUsers(8);
      const scores = await history(
        c.id,
        users.map((u) => u.id),
      );

      for (const at of [0, 3, 7, 9]) {
        const fromSql = await rankBoard(c.id, board, at);
        expect(fromSql, `at round ${at}`).toEqual(boardRanking(scores, board, at));
      }
    },
  );

  it("answers with nothing when nobody has played", async () => {
    const c = await competition();

    expect(await rankBoard(c.id, SHAPES[0].board, 0)).toEqual([]);
  });

  it("keeps one competition out of another's ranking", async () => {
    const mine = await competition();
    const other = await competition();
    const users = await createUsers(3);
    await history(
      mine.id,
      users.map((u) => u.id),
    );

    expect(await rankBoard(other.id, SHAPES[2].board, 0)).toEqual([]);
  });

  it("counts a member who played once and leaves out one who never did", async () => {
    const c = await competition();
    const [played, absent] = await createUsers(2);
    const round = await prisma.quizRound.create({
      data: {
        competitionId: c.id,
        index: 0,
        opensAt: START,
        closesAt: new Date(START.getTime() + PERIOD),
      },
    });
    await prisma.quizAttempt.create({
      data: { roundId: round.id, userId: played.id, score: 40, finishedAt: START },
    });

    const rows = await rankBoard(c.id, SHAPES[0].board, 0);

    expect(rows).toEqual([{ rank: 1, userId: played.id, total: 40, settledAt: START }]);
    expect(rows.some((r) => r.userId === absent.id)).toBe(false);
  });
});
