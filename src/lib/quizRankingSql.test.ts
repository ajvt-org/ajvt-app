import { describe, it, expect, beforeEach, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
vi.mock("./prisma", () => ({ prisma: { $queryRaw: queryRaw } }));

const { blockFilter, rankBoard } = await import("./quizRankingSql");

const ROUND = { blockRounds: 1, counting: 1, wholeRun: false };
const WEEK = { blockRounds: 7, counting: 6, wholeRun: false };
const WHOLE = { blockRounds: 1, counting: 1, wholeRun: true };

beforeEach(() => {
  queryRaw.mockReset();
  queryRaw.mockResolvedValue([]);
});

describe("blockFilter", () => {
  it("keeps a block board to the block the round sits in", () => {
    expect(blockFilter(ROUND, 5)).toEqual({ size: 1, only: 5 });
    expect(blockFilter(WEEK, 9)).toEqual({ size: 7, only: 1 });
    expect(blockFilter(WEEK, 6)).toEqual({ size: 7, only: 0 });
  });

  it("lets a whole run board see every block", () => {
    expect(blockFilter(WHOLE, 9)).toEqual({ size: 1, only: null });
  });

  it("treats a block of no rounds as a block of one", () => {
    expect(blockFilter({ blockRounds: 0, counting: 1, wholeRun: false }, 4)).toEqual({
      size: 1,
      only: 4,
    });
  });

  it("holds at the first block for a round before the start", () => {
    expect(blockFilter(WEEK, -3)).toEqual({ size: 7, only: 0 });
  });
});

describe("rankBoard", () => {
  it("hands back what the database ranked", async () => {
    const settledAt = new Date("2026-08-02T09:00:00.000Z");
    queryRaw.mockResolvedValue([
      { userId: "u1", total: 90, settledAt, rank: 1 },
      { userId: "u2", total: 40, settledAt: null, rank: 2 },
    ]);

    expect(await rankBoard("c1", ROUND, 0)).toEqual([
      { rank: 1, userId: "u1", total: 90, settledAt },
      { rank: 2, userId: "u2", total: 40, settledAt: null },
    ]);
  });

  it("answers with nothing when nobody has played", async () => {
    expect(await rankBoard("c1", WHOLE, 3)).toEqual([]);
  });

  it("counts every round of a block when the board counts nothing", async () => {
    await rankBoard("c1", { blockRounds: 4, counting: 0, wholeRun: false }, 5);

    const params = queryRaw.mock.calls[0].slice(1);
    expect(params).toContain(4);
  });

  it("asks for the block the round sits in", async () => {
    await rankBoard("c1", WEEK, 9);

    const params = queryRaw.mock.calls[0].slice(1);
    expect(params).toContain("c1");
    expect(params).toContain(1);
  });
});
