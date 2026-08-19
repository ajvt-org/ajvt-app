import { describe, it, expect } from "vitest";
import {
  roundRanking,
  groupRanking,
  finalRanking,
  bestRounds,
  standingOf,
  type RoundScore,
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

describe("groupRanking", () => {
  const group = (userId: string, scores: number[], from = 0) =>
    scores.map((points, i) => score(userId, from + i, points));

  it("counts only the best rounds of the group", () => {
    const rows = groupRanking(group("a", [10, 10, 10, 10, 10, 10, 10]), 7, 6, 0);

    expect(rows[0].total).toBe(60);
  });

  it("lets a missed round cost nothing when the allowance covers it", () => {
    const perfect = group("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = group("missed", [10, 10, 10, 10, 10, 10]);

    const rows = groupRanking([...perfect, ...missed], 7, 6, 0);

    expect(rows[0].total).toBe(rows[1].total);
  });

  it("makes a second missed round hurt", () => {
    const perfect = group("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = group("missed", [10, 10, 10, 10, 10]);

    const rows = groupRanking([...perfect, ...missed], 7, 6, 0);

    expect(rows[0].userId).toBe("perfect");
    expect(rows[1].total).toBe(50);
  });

  it("keeps the groups apart", () => {
    const first = score("a", 0, 40);
    const second = score("a", 7, 90);

    expect(groupRanking([first, second], 7, 6, 0)[0].total).toBe(40);
    expect(groupRanking([first, second], 7, 6, 1)[0].total).toBe(90);
  });

  it("groups by five when that is the size", () => {
    expect(groupRanking([score("a", 4, 10), score("a", 5, 90)], 5, 5, 0)[0].total).toBe(10);
    expect(groupRanking([score("a", 4, 10), score("a", 5, 90)], 5, 5, 1)[0].total).toBe(90);
  });

  it("ignores a round before the run began", () => {
    expect(groupRanking([score("a", -1, 90)], 7, 6, 0)).toEqual([]);
  });
});

describe("finalRanking", () => {
  const rounds = (userId: string, count: number, points: number, from = 0) =>
    Array.from({ length: count }, (_, i) => score(userId, from + i, points));

  it("adds the groups together, each having dropped its worst round", () => {
    const rows = finalRanking([...rounds("a", 7, 10), ...rounds("a", 7, 10, 7)], 7, 6);

    expect(rows[0].total).toBe(120);
  });

  it("scores a member who joined late on what they actually played", () => {
    const early = rounds("early", 7, 10);
    const late = [score("late", 5, 10), score("late", 6, 10)];

    const rows = finalRanking([...early, ...late], 7, 6);

    expect(rows[0].userId).toBe("early");
    expect(rows[0].total).toBe(60);
    expect(rows[1].total).toBe(20);
  });

  it("is empty before anyone plays", () => {
    expect(finalRanking([], 7, 6)).toEqual([]);
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
