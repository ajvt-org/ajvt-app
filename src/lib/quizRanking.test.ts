import { describe, it, expect } from "vitest";
import {
  dailyRanking,
  weeklyRanking,
  finalRanking,
  countingDays,
  standingOf,
  type DayScore,
} from "./quizRanking";

const START = "2026-08-20";
const at = (iso: string) => new Date(iso);

function score(userId: string, day: string, points: number, finished?: string): DayScore {
  return { userId, day, score: points, finishedAt: finished ? at(finished) : null };
}

describe("dailyRanking", () => {
  it("puts the highest score first", () => {
    const rows = dailyRanking(
      [score("a", START, 30), score("b", START, 50), score("c", START, 10)],
      START,
    );

    expect(rows.map((r) => r.userId)).toEqual(["b", "a", "c"]);
    expect(rows[0].rank).toBe(1);
  });

  it("breaks a tie by who finished first", () => {
    const rows = dailyRanking(
      [
        score("late", START, 30, "2026-08-20T12:00:00Z"),
        score("early", START, 30, "2026-08-20T09:00:00Z"),
      ],
      START,
    );

    expect(rows.map((r) => r.userId)).toEqual(["early", "late"]);
  });

  it("puts someone who finished above someone who never did", () => {
    const rows = dailyRanking(
      [score("unfinished", START, 30), score("finished", START, 30, "2026-08-20T12:00:00Z")],
      START,
    );

    expect(rows[0].userId).toBe("finished");
  });

  it("ignores other days", () => {
    const rows = dailyRanking([score("a", START, 30), score("b", "2026-08-21", 90)], START);

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("a");
  });

  it("is empty when nobody played", () => {
    expect(dailyRanking([], START)).toEqual([]);
  });
});

describe("countingDays", () => {
  it("keeps the best days and drops the rest", () => {
    const days = [
      score("a", "d1", 10),
      score("a", "d2", 50),
      score("a", "d3", 30),
      score("a", "d4", 20),
    ];

    expect(countingDays(days, 3).map((d) => d.score)).toEqual([50, 30, 20]);
  });

  it("keeps everything when there is less than the allowance", () => {
    expect(countingDays([score("a", "d1", 10)], 6)).toHaveLength(1);
  });

  it("keeps nothing when the allowance is zero", () => {
    expect(countingDays([score("a", "d1", 10)], 0)).toEqual([]);
  });
});

describe("weeklyRanking", () => {
  const week = (userId: string, scores: number[]) =>
    scores.map((points, i) => {
      const d = new Date(`${START}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return score(userId, d.toISOString().slice(0, 10), points);
    });

  it("counts only the best days of the week", () => {
    const rows = weeklyRanking([...week("a", [10, 10, 10, 10, 10, 10, 10])], START, 6, 0);

    expect(rows[0].total).toBe(60);
  });

  it("lets a missed day cost nothing when the allowance covers it", () => {
    const perfect = week("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = week("missed", [10, 10, 10, 10, 10, 10]).slice(0, 6);

    const rows = weeklyRanking([...perfect, ...missed], START, 6, 0);

    expect(rows[0].total).toBe(rows[1].total);
  });

  it("makes a second missed day hurt", () => {
    const perfect = week("perfect", [10, 10, 10, 10, 10, 10, 10]);
    const missed = week("missed", [10, 10, 10, 10, 10]);

    const rows = weeklyRanking([...perfect, ...missed], START, 6, 0);

    expect(rows[0].userId).toBe("perfect");
    expect(rows[1].total).toBe(50);
  });

  it("keeps the weeks apart", () => {
    const first = score("a", START, 40);
    const second = score("a", "2026-08-27", 90);

    expect(weeklyRanking([first, second], START, 6, 0)[0].total).toBe(40);
    expect(weeklyRanking([first, second], START, 6, 1)[0].total).toBe(90);
  });

  it("ignores a day before the run began", () => {
    expect(weeklyRanking([score("a", "2026-08-19", 90)], START, 6, 0)).toEqual([]);
  });
});

describe("finalRanking", () => {
  const day = (userId: string, offset: number, points: number) => {
    const d = new Date(`${START}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return score(userId, d.toISOString().slice(0, 10), points);
  };

  it("adds the weeks together, each with its own dropped day", () => {
    const rows = finalRanking(
      [
        ...Array.from({ length: 7 }, (_, i) => day("a", i, 10)),
        ...Array.from({ length: 7 }, (_, i) => day("a", i + 7, 10)),
      ],
      START,
      6,
    );

    expect(rows[0].total).toBe(120);
  });

  it("scores a member who joined late on what they actually played", () => {
    const early = Array.from({ length: 7 }, (_, i) => day("early", i, 10));
    const late = [day("late", 5, 10), day("late", 6, 10)];

    const rows = finalRanking([...early, ...late], START, 6);

    expect(rows[0].userId).toBe("early");
    expect(rows[0].total).toBe(60);
    expect(rows[1].total).toBe(20);
  });

  it("is empty before anyone plays", () => {
    expect(finalRanking([], START, 6)).toEqual([]);
  });
});

describe("standingOf", () => {
  it("finds a member's place", () => {
    const rows = dailyRanking([score("a", START, 30), score("b", START, 50)], START);

    expect(standingOf(rows, "a")?.rank).toBe(2);
  });

  it("says nothing for a member who has not played", () => {
    expect(standingOf(dailyRanking([], START), "a")).toBeNull();
  });
});
