import { describe, it, expect } from "vitest";
import {
  roundRanking,
  boardRanking,
  bestRounds,
  standingOf,
  type RoundScore,
  blockAnchor,
  blockLabel,
  boardBlocks,
} from "./quizRanking";

const at = (iso: string) => new Date(iso);

function score(userId: string, index: number, points: number, finished?: string): RoundScore {
  return { userId, index, score: points, finishedAt: finished ? at(finished) : null };
}

describe("roundRanking", () => {
  it("puts the highest score first", () => {
    const rows = roundRanking([score("a", 0, 30), score("b", 0, 50), score("c", 0, 10)], 0);

    expect(rows.map((r) => r.userId)).toEqual(["b", "a", "c"]);
    expect(rows[0].rank).toBe(1);
  });

  it("breaks a tie by who finished first", () => {
    const rows = roundRanking(
      [score("late", 0, 30, "2026-08-20T12:00:00Z"), score("early", 0, 30, "2026-08-20T09:00:00Z")],
      0,
    );

    expect(rows.map((r) => r.userId)).toEqual(["early", "late"]);
  });

  it("puts someone who finished above someone who never did", () => {
    const rows = roundRanking(
      [score("unfinished", 0, 30), score("finished", 0, 30, "2026-08-20T12:00:00Z")],
      0,
    );

    expect(rows[0].userId).toBe("finished");
  });

  it("ignores other rounds", () => {
    const rows = roundRanking([score("a", 0, 30), score("b", 1, 90)], 0);

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("a");
  });

  it("is empty when nobody played", () => {
    expect(roundRanking([], 0)).toEqual([]);
  });
});

describe("bestRounds", () => {
  it("keeps the best days and drops the rest", () => {
    const days = [score("a", 0, 10), score("a", 1, 50), score("a", 2, 30), score("a", 3, 20)];

    expect(bestRounds(days, 3).map((d) => d.score)).toEqual([50, 30, 20]);
  });

  it("keeps everything when there is less than the allowance", () => {
    expect(bestRounds([score("a", 0, 10)], 6)).toHaveLength(1);
  });

  it("keeps nothing when the allowance is zero", () => {
    expect(bestRounds([score("a", 0, 10)], 0)).toEqual([]);
  });
});

describe("boardRanking over the block a round sits in", () => {
  const board = { title: "أسبوعي", blockRounds: 7, counting: 6, wholeRun: false };
  const group = (userId: string, scores: number[], from = 0) =>
    scores.map((points, i) => score(userId, from + i, points));

  it("counts only the best rounds of the block", () => {
    const rows = boardRanking(group("a", [10, 10, 10, 10, 10, 10, 10]), board, 0);

    expect(rows[0].total).toBe(60);
  });

  it("lets a missed round cost nothing while the allowance covers it", () => {
    const perfect = group("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = group("missed", [10, 10, 10, 10, 10, 10]);

    const rows = boardRanking([...perfect, ...missed], board, 0);

    expect(rows[0].total).toBe(rows[1].total);
  });

  it("makes a second missed round hurt", () => {
    const perfect = group("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = group("missed", [10, 10, 10, 10, 10]);

    const rows = boardRanking([...perfect, ...missed], board, 0);

    expect(rows[0].userId).toBe("perfect");
    expect(rows[1].total).toBe(50);
  });

  it("reads the block the given round sits in", () => {
    const first = score("a", 0, 40);
    const second = score("a", 7, 90);

    expect(boardRanking([first, second], board, 0)[0].total).toBe(40);
    expect(boardRanking([first, second], board, 7)[0].total).toBe(90);
  });

  it("blocks by whatever size the ranking names", () => {
    const five = { title: "كل خمس", blockRounds: 5, counting: 5, wholeRun: false };

    expect(boardRanking([score("a", 4, 10), score("a", 5, 90)], five, 4)[0].total).toBe(10);
    expect(boardRanking([score("a", 4, 10), score("a", 5, 90)], five, 5)[0].total).toBe(90);
  });

  it("ranks a single round when that is the block", () => {
    const daily = { title: "يومي", blockRounds: 1, counting: 1, wholeRun: false };
    const rows = boardRanking([score("a", 3, 30), score("b", 3, 50), score("c", 4, 90)], daily, 3);

    expect(rows.map((r) => r.userId)).toEqual(["b", "a"]);
  });

  it("ignores a round before the run began", () => {
    expect(boardRanking([score("a", -1, 90)], board, 0)).toEqual([]);
  });
});

describe("boardRanking over the whole run", () => {
  const board = { title: "عام", blockRounds: 7, counting: 6, wholeRun: true };
  const rounds = (userId: string, count: number, points: number, from = 0) =>
    Array.from({ length: count }, (_, i) => score(userId, from + i, points));

  it("adds the blocks together, each having dropped its worst round", () => {
    const rows = boardRanking([...rounds("a", 7, 10), ...rounds("a", 7, 10, 7)], board, 0);

    expect(rows[0].total).toBe(120);
  });

  it("scores a member who joined late on what they actually played", () => {
    const early = rounds("early", 7, 10);
    const late = [score("late", 5, 10), score("late", 6, 10)];

    const rows = boardRanking([...early, ...late], board, 0);

    expect(rows[0].userId).toBe("early");
    expect(rows[0].total).toBe(60);
    expect(rows[1].total).toBe(20);
  });

  it("does not care which round is open", () => {
    const scores = [...rounds("a", 7, 10), ...rounds("a", 7, 10, 7)];

    expect(boardRanking(scores, board, 0)[0].total).toBe(boardRanking(scores, board, 9)[0].total);
  });

  it("sums everything when the allowance covers the block", () => {
    const plain = { title: "عام", blockRounds: 7, counting: 7, wholeRun: true };

    expect(boardRanking(rounds("a", 14, 10), plain, 0)[0].total).toBe(140);
  });

  it("is empty before anyone plays", () => {
    expect(boardRanking([], board, 0)).toEqual([]);
  });
});

describe("standingOf", () => {
  it("finds a member's place", () => {
    const rows = roundRanking([score("a", 0, 30), score("b", 0, 50)], 0);

    expect(standingOf(rows, "a")?.rank).toBe(2);
  });

  it("says nothing for a member who has not played", () => {
    expect(standingOf(roundRanking([], 0), "a")).toBeNull();
  });
});

describe("blockLabel", () => {
  it("names a single round block by its round", () => {
    expect(blockLabel(1, 0, 30)).toBe("الجولة 1");
    expect(blockLabel(1, 6, 30)).toBe("الجولة 7");
  });

  it("names a span of rounds by its edges", () => {
    expect(blockLabel(7, 0, 30)).toBe("الجولات 1 - 7");
    expect(blockLabel(7, 1, 30)).toBe("الجولات 8 - 14");
  });

  it("cuts the last span at the run's end", () => {
    expect(blockLabel(7, 4, 30)).toBe("الجولات 29 - 30");
  });

  it("names a span of one round as that round", () => {
    expect(blockLabel(7, 4, 29)).toBe("الجولة 29");
  });

  it("batches four round blocks as 1-4, 5-8, 9-12", () => {
    expect(blockLabel(4, 0, 12)).toBe("الجولات 1 - 4");
    expect(blockLabel(4, 1, 12)).toBe("الجولات 5 - 8");
    expect(blockLabel(4, 2, 12)).toBe("الجولات 9 - 12");
  });

  it("uses the board's own block word when one is given", () => {
    expect(blockLabel(7, 0, 30, "الأسبوع")).toBe("الأسبوع 1");
    expect(blockLabel(7, 2, 30, "الأسبوع")).toBe("الأسبوع 3");
    expect(blockLabel(7, 0, 30, "  ")).toBe("الجولات 1 - 7");
  });
});

describe("a four round board", () => {
  const board = { blockRounds: 4, counting: 4, wholeRun: false };
  const played = (userId: string, index: number, score: number): RoundScore => ({
    userId,
    index,
    score,
    finishedAt: new Date(index * 60_000),
  });
  const scores = [played("a", 0, 10), played("a", 3, 10), played("a", 4, 7), played("a", 7, 7)];

  it("adds up only the block's own rounds", () => {
    expect(boardRanking(scores, board, 3)[0].total).toBe(20);
    expect(boardRanking(scores, board, 4)[0].total).toBe(14);
  });

  it("turns the block exactly at the fourth round", () => {
    expect(boardBlocks(board, 3)).toEqual({ block: 0, blocks: 1 });
    expect(boardBlocks(board, 4)).toEqual({ block: 1, blocks: 2 });
  });
});

describe("boardBlocks", () => {
  it("keeps a whole run to one block", () => {
    expect(boardBlocks({ blockRounds: 1, counting: 1, wholeRun: true }, 9)).toEqual({
      block: 0,
      blocks: 1,
    });
  });

  it("counts the blocks up to the current round", () => {
    expect(boardBlocks({ blockRounds: 7, counting: 6, wholeRun: false }, 15)).toEqual({
      block: 2,
      blocks: 3,
    });
  });
});

describe("blockAnchor", () => {
  it("anchors a block at its first round", () => {
    expect(blockAnchor({ blockRounds: 7, counting: 6, wholeRun: false }, 2, 20)).toBe(14);
  });

  it("anchors a whole run at the current round", () => {
    expect(blockAnchor({ blockRounds: 1, counting: 1, wholeRun: true }, 3, 20)).toBe(20);
  });
});

describe("breaking a tie", () => {
  const settled = (userId: string, minute: number | null): RoundScore => ({
    userId,
    index: 0,
    score: 10,
    finishedAt: minute === null ? null : new Date(minute * 60_000),
  });

  it("puts the earlier finisher first on equal totals", () => {
    const rows = roundRanking([settled("a", 9), settled("b", 3)], 0);

    expect(rows.map((r) => r.userId)).toEqual(["b", "a"]);
  });

  it("puts a settled attempt above an unsettled one", () => {
    const rows = roundRanking([settled("a", null), settled("b", 5)], 0);

    expect(rows.map((r) => r.userId)).toEqual(["b", "a"]);
  });

  it("falls back to the user id when neither settled", () => {
    const rows = roundRanking([settled("b", null), settled("a", null)], 0);

    expect(rows.map((r) => r.userId)).toEqual(["a", "b"]);
  });
});
