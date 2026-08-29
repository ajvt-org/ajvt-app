import { describe, it, expect } from "vitest";
import { computeStandings, groupStandings, type StandingsMatchInput } from "./standings";

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
