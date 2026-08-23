import { describe, it, expect } from "vitest";
import {
  computeStandings,
  computeStats,
  drawKnockoutPairs,
  groupStandings,
  computeTopScorers,
  generateMatchSchedule,
  getMatchWinnerTeamId,
  bracketRoundLabel,
  isPowerOfTwo,
  type StandingsMatchInput,
} from "./tournament";

const teams = [
  { id: "a", name: "ألف" },
  { id: "b", name: "باء" },
  { id: "c", name: "جيم" },
];

function match(
  home: string,
  away: string,
  homeScore: number | null,
  awayScore: number | null,
  extra: Partial<StandingsMatchInput> = {},
): StandingsMatchInput {
  return {
    homeTeam: { id: home },
    awayTeam: { id: away },
    homeScore,
    awayScore,
    status: "PLAYED",
    isKnockout: false,
    ...extra,
  };
}

describe("computeStandings", () => {
  it("gives 3 points for a win and 1 for a draw", () => {
    const table = computeStandings(teams, [match("a", "b", 2, 0), match("b", "c", 1, 1)]);
    const by = Object.fromEntries(table.map((r) => [r.teamId, r]));

    expect(by.a.points).toBe(3);
    expect(by.a.won).toBe(1);
    expect(by.b.points).toBe(1);
    expect(by.b.drawn).toBe(1);
    expect(by.b.lost).toBe(1);
    expect(by.c.points).toBe(1);
  });

  it("tracks goals for, against and difference from both sides", () => {
    const table = computeStandings(teams, [match("a", "b", 3, 1)]);
    const by = Object.fromEntries(table.map((r) => [r.teamId, r]));

    expect([by.a.gf, by.a.ga, by.a.gd]).toEqual([3, 1, 2]);
    expect([by.b.gf, by.b.ga, by.b.gd]).toEqual([1, 3, -2]);
  });

  it("ignores knockout matches, they are not part of the league table", () => {
    const table = computeStandings(teams, [match("a", "b", 5, 0, { isKnockout: true })]);

    expect(table.every((r) => r.played === 0)).toBe(true);
    expect(table.every((r) => r.points === 0)).toBe(true);
  });

  it("ignores matches that have not been played", () => {
    const table = computeStandings(teams, [
      match("a", "b", null, null, { status: "SCHEDULED" }),
      match("a", "c", 2, 1, { status: "SCHEDULED" }),
      match("b", "c", null, null),
    ]);

    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it("ignores a match whose teams are not in this table", () => {
    const table = computeStandings([teams[0]], [match("a", "zzz", 1, 0)]);

    expect(table[0].played).toBe(0);
  });

  it("ranks on points, then goal difference, then goals scored", () => {
    const four = [...teams, { id: "d", name: "دال" }];
    const table = computeStandings(four, [
      // a: 3 pts, gd +1   b: 3 pts, gd +3   c: 3 pts, gd +3 but fewer goals
      match("a", "d", 1, 0),
      match("b", "d", 4, 1),
      match("c", "d", 3, 0),
    ]);

    expect(table.map((r) => r.teamId)).toEqual(["b", "c", "a", "d"]);
  });

  it("falls back to the team name so the order is never arbitrary", () => {
    const table = computeStandings(teams, []);

    expect(table.map((r) => r.teamId)).toEqual(["a", "b", "c"]);
  });
});

describe("groupStandings", () => {
  it("computes a separate table per group", () => {
    const grouped = groupStandings(
      [
        { id: "a", name: "ألف", groupId: "g1" },
        { id: "b", name: "باء", groupId: "g1" },
        { id: "c", name: "جيم", groupId: "g2" },
        { id: "d", name: "دال", groupId: "g2" },
      ],
      [match("a", "b", 1, 0), match("c", "d", 2, 2)],
    );

    expect(grouped).toHaveLength(2);
    const g1 = grouped.find((g) => g.groupId === "g1")!;
    expect(g1.standings.map((r) => r.teamId)).toEqual(["a", "b"]);
    expect(g1.standings[0].points).toBe(3);

    const g2 = grouped.find((g) => g.groupId === "g2")!;
    expect(g2.standings.every((r) => r.points === 1)).toBe(true);
  });

  it("keeps ungrouped teams together under null", () => {
    const grouped = groupStandings([{ id: "a", name: "ألف" }], []);

    expect(grouped[0].groupId).toBeNull();
  });

  it("orders the groups as given, ungrouped last, whatever the team order", () => {
    const grouped = groupStandings(
      [
        { id: "x", name: "بلا مجموعة" },
        { id: "c", name: "جيم", groupId: "g2" },
        { id: "a", name: "ألف", groupId: "g1" },
      ],
      [],
      ["g1", "g2"],
    );

    expect(grouped.map((g) => g.groupId)).toEqual(["g1", "g2", null]);
  });
});

describe("drawKnockoutPairs", () => {
  const t = (id: string, groupId: string | null = null) => ({ id, groupId });

  it("never pairs two teams of the same group when a crossing exists", () => {
    const pairs = drawKnockoutPairs([t("a1", "g1"), t("a2", "g1"), t("b1", "g2"), t("b2", "g2")]);

    expect(pairs).toHaveLength(2);
    for (const [x, y] of pairs!) expect(x.groupId).not.toBe(y.groupId);
  });

  it("backtracks out of a greedy dead end", () => {
    const pairs = drawKnockoutPairs([
      t("a1", "g1"),
      t("b1", "g2"),
      t("a2", "g1"),
      t("b2", "g2"),
      t("c1", "g3"),
      t("c2", "g3"),
    ]);

    expect(pairs).toHaveLength(3);
    for (const [x, y] of pairs!) expect(x.groupId).not.toBe(y.groupId);
  });

  it("gives up when one group holds more than half the field", () => {
    expect(
      drawKnockoutPairs([t("a1", "g1"), t("a2", "g1"), t("a3", "g1"), t("b1", "g2")]),
    ).toBeNull();
  });

  it("pairs groupless teams freely", () => {
    expect(drawKnockoutPairs([t("a"), t("b"), t("c"), t("d")])).toHaveLength(2);
  });
});

describe("computeStats", () => {
  it("counts knockout matches like every other played match", () => {
    const stats = computeStats(teams, [
      match("a", "b", 3, 0),
      match("a", "c", 2, 0, { isKnockout: true }),
    ]);

    expect(stats.matchesPlayed).toBe(2);
    expect(stats.totalGoals).toBe(5);
    expect(stats.bestAttack).toMatchObject({ teamId: "a", gf: 5 });
    expect(stats.bestDefense).toMatchObject({ teamId: "a", ga: 0 });
  });

  it("leaves a scheduled match out of the goal count", () => {
    const stats = computeStats(teams, [match("a", "b", 2, 1, { status: "SCHEDULED" })]);

    expect(stats.matchesPlayed).toBe(0);
    expect(stats.totalGoals).toBe(0);
    expect(stats.bestAttack).toBeNull();
  });
});

describe("computeTopScorers", () => {
  it("adds a player's goals across matches", () => {
    const rows = computeTopScorers(teams, [
      { goals: [{ teamId: "a", count: 2, member: { id: "m1", fullName: "محمد" } }] },
      { goals: [{ teamId: "a", count: 1, member: { id: "m1", fullName: "محمد" } }] },
      { goals: [{ teamId: "b", count: 1, member: { id: "m2", fullName: "أحمد" } }] },
    ]);

    expect(rows[0]).toMatchObject({ memberId: "m1", goals: 3, teamName: "ألف" });
    expect(rows[1]).toMatchObject({ memberId: "m2", goals: 1 });
  });

  it("returns nothing when no goals were scored", () => {
    expect(computeTopScorers(teams, [{ goals: [] }])).toEqual([]);
  });
});

describe("getMatchWinnerTeamId", () => {
  const base = {
    homeTeamId: "a",
    awayTeamId: "b",
    homePenalties: null,
    awayPenalties: null,
    status: "PLAYED",
  };

  it("returns the side that scored more", () => {
    expect(getMatchWinnerTeamId({ ...base, homeScore: 2, awayScore: 1 })).toBe("a");
    expect(getMatchWinnerTeamId({ ...base, homeScore: 0, awayScore: 3 })).toBe("b");
  });

  it("has no winner for an unplayed match", () => {
    expect(
      getMatchWinnerTeamId({ ...base, homeScore: null, awayScore: null, status: "SCHEDULED" }),
    ).toBeNull();
  });

  it("has no winner for a draw with no shootout", () => {
    expect(getMatchWinnerTeamId({ ...base, homeScore: 1, awayScore: 1 })).toBeNull();
  });

  it("uses penalties to break a draw", () => {
    expect(
      getMatchWinnerTeamId({
        ...base,
        homeScore: 1,
        awayScore: 1,
        homePenalties: 4,
        awayPenalties: 3,
      }),
    ).toBe("a");
  });

  it("still has no winner if the shootout is level", () => {
    expect(
      getMatchWinnerTeamId({
        ...base,
        homeScore: 1,
        awayScore: 1,
        homePenalties: 3,
        awayPenalties: 3,
      }),
    ).toBeNull();
  });
});

describe("bracketRoundLabel", () => {
  it("names the rounds by how many matches remain", () => {
    expect(bracketRoundLabel(1)).toBe("النهائي");
    expect(bracketRoundLabel(2)).toBe("نصف النهائي");
    expect(bracketRoundLabel(4)).toBe("ربع النهائي");
    expect(bracketRoundLabel(8)).toBe("دور الـ16");
  });

  it("falls back for a count that is not a clean bracket", () => {
    expect(bracketRoundLabel(3)).toBe("الدور الإقصائي");
    expect(bracketRoundLabel(0)).toBe("الدور الإقصائي");
  });
});

describe("generateMatchSchedule", () => {
  function counts(fixtures: { homeTeamId: string; awayTeamId: string }[]) {
    const c = new Map<string, number>();
    for (const f of fixtures) {
      c.set(f.homeTeamId, (c.get(f.homeTeamId) || 0) + 1);
      c.set(f.awayTeamId, (c.get(f.awayTeamId) || 0) + 1);
    }
    return c;
  }

  it("needs at least two teams", () => {
    expect(generateMatchSchedule([])).toEqual([]);
    expect(generateMatchSchedule(["a"])).toEqual([]);
  });

  it("gives every team the target number of matches, even team count", () => {
    for (const size of [4, 6, 8]) {
      const ids = Array.from({ length: size }, (_, i) => `t${i}`);
      const fixtures = generateMatchSchedule(ids, 3);
      const c = counts(fixtures);
      for (const id of ids) expect(c.get(id), `${size} teams, ${id}`).toBe(3);
    }
  });

  it("never pairs a team against itself", () => {
    const ids = Array.from({ length: 7 }, (_, i) => `t${i}`);
    for (const f of generateMatchSchedule(ids, 3)) {
      expect(f.homeTeamId).not.toBe(f.awayTeamId);
    }
  });

  it("never asks a team to play twice in the same round", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const byRound = new Map<number, string[]>();
    for (const f of generateMatchSchedule(ids, 3)) {
      const list = byRound.get(f.round) || [];
      list.push(f.homeTeamId, f.awayTeamId);
      byRound.set(f.round, list);
    }
    for (const [round, ids2] of byRound) {
      expect(new Set(ids2).size, `round ${round}`).toBe(ids2.length);
    }
  });

  it("brings an odd number of teams as close to the target as it can", () => {
    const ids = Array.from({ length: 5 }, (_, i) => `t${i}`);
    const c = counts(generateMatchSchedule(ids, 3));

    // 3 matches each for 5 teams needs 7.5 matches, so it cannot be exact.
    for (const id of ids) expect(c.get(id)).toBeGreaterThanOrEqual(3);
  });

  it("respects matches already played", () => {
    const ids = ["a", "b", "c", "d"];
    const existing = new Map([
      ["a", 3],
      ["b", 3],
    ]);
    const fixtures = generateMatchSchedule(ids, 3, existing, new Set());

    for (const f of fixtures) {
      expect([f.homeTeamId, f.awayTeamId]).not.toContain("a");
      expect([f.homeTeamId, f.awayTeamId]).not.toContain("b");
    }
  });

  it("prefers new opponents over a rematch", () => {
    const ids = ["a", "b", "c", "d"];
    const pairs = generateMatchSchedule(ids, 3).map((f) =>
      [f.homeTeamId, f.awayTeamId].sort().join("|"),
    );

    expect(new Set(pairs).size).toBe(pairs.length);
  });
});

describe("isPowerOfTwo", () => {
  it("accepts bracket sizes that halve cleanly", () => {
    for (const n of [2, 4, 8, 16, 32]) expect(isPowerOfTwo(n)).toBe(true);
  });

  it("rejects sizes that would leave an odd round", () => {
    for (const n of [3, 5, 6, 7, 9, 12]) expect(isPowerOfTwo(n)).toBe(false);
  });

  it("rejects anything below two teams", () => {
    expect(isPowerOfTwo(1)).toBe(false);
    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(-4)).toBe(false);
  });
});
