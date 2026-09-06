import { describe, it, expect } from "vitest";
import {
  computeStandings,
  groupStandings,
  RED_POINTS,
  YELLOW_POINTS,
  type StandingsMatchInput,
} from "./standings";

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
    firstTeam: { id: home },
    secondTeam: { id: away },
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

    expect([by.a.scoredFor, by.a.scoredAgainst, by.a.difference]).toEqual([3, 1, 2]);
    expect([by.b.scoredFor, by.b.scoredAgainst, by.b.difference]).toEqual([1, 3, -2]);
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

const four = [
  { id: "a", name: "ألف" },
  { id: "b", name: "باء" },
  { id: "c", name: "جيم" },
  { id: "d", name: "دال" },
];

const cards = (teamId: string, cardType: string) => ({ teamId, cardType });

describe("separating teams level on points", () => {
  it("uses the match between them before goal difference", () => {
    const table = computeStandings(four, [
      match("a", "b", 0, 1),
      match("a", "c", 5, 0),
      match("b", "c", 1, 0),
    ]);

    expect(table[0].teamId).toBe("b");
    expect(table[1].teamId).toBe("a");
  });

  it("falls to goal difference when the meeting was a draw", () => {
    const table = computeStandings(four, [
      match("a", "b", 1, 1),
      match("a", "c", 3, 0),
      match("b", "c", 1, 0),
    ]);

    expect(table.map((r) => r.teamId).slice(0, 2)).toEqual(["a", "b"]);
  });

  it("falls to goals scored when the difference is equal too", () => {
    const table = computeStandings(four, [
      match("a", "b", 1, 1),
      match("a", "c", 3, 2),
      match("b", "d", 1, 0),
    ]);

    expect(table[0].teamId).toBe("a");
  });

  it("prefers the cleaner record when everything else is level", () => {
    const table = computeStandings(four, [
      match("a", "b", 0, 0, { bookings: [cards("a", "YELLOW"), cards("b", "RED")] }),
      match("a", "c", 1, 0),
      match("b", "d", 1, 0),
    ]);

    expect(table[0].teamId).toBe("a");
    expect(table[0].cardPoints).toBe(YELLOW_POINTS);
    expect(table[1].cardPoints).toBe(RED_POINTS);
  });

  it("counts a red as heavier than a yellow", () => {
    expect(RED_POINTS).toBeGreaterThan(YELLOW_POINTS);
  });

  it("marks a tie that no rule can settle rather than ordering by name", () => {
    const table = computeStandings(four, [match("a", "b", 0, 0), match("c", "d", 0, 0)]);

    expect(table.every((r) => r.unresolved)).toBe(true);
  });

  it("leaves a settled table unmarked", () => {
    const table = computeStandings(four, [match("a", "b", 2, 0)]);

    expect(table.find((r) => r.teamId === "a")!.unresolved).toBe(false);
    expect(table.find((r) => r.teamId === "b")!.unresolved).toBe(false);
  });

  it("marks only the teams that are actually level", () => {
    const table = computeStandings(four, [
      match("a", "b", 1, 0),
      match("a", "c", 1, 0),
      match("a", "d", 1, 0),
      match("b", "c", 0, 0),
    ]);

    const mark = (id: string) => table.find((r) => r.teamId === id)!.unresolved;
    expect(mark("a")).toBe(false);
    expect(mark("d")).toBe(false);
    expect(mark("b")).toBe(true);
    expect(mark("c")).toBe(true);
  });

  it("keeps cards out of the reckoning until the goals are level", () => {
    const table = computeStandings(four, [
      match("a", "b", 0, 3, { bookings: [cards("b", "RED"), cards("b", "RED")] }),
    ]);

    expect(table[0].teamId).toBe("b");
  });

  it("reads the group the association is actually playing, three draws and all", () => {
    const group = [
      { id: "castiaB", name: "كاستيا B" },
      { id: "technique", name: "اف سي تكنيك" },
      { id: "badrayn", name: "البدريين A" },
      { id: "jadidaA", name: "اتحاد الجديدة A" },
    ];
    const table = computeStandings(group, [
      match("badrayn", "technique", 0, 0),
      match("castiaB", "jadidaA", 1, 0),
      match("badrayn", "jadidaA", 0, 0),
      match("technique", "castiaB", 0, 0),
      match("badrayn", "castiaB", 0, 0),
      match("jadidaA", "technique", 0, 0),
    ]);

    expect(table[0].teamId).toBe("castiaB");
    const level = table.filter((r) => r.unresolved).map((r) => r.teamId);
    expect(level).toContain("technique");
    expect(level).toContain("badrayn");
  });
});

describe("a fixture with no teams yet", () => {
  const empty = (extra: Partial<StandingsMatchInput> = {}): StandingsMatchInput => ({
    firstTeam: null,
    secondTeam: null,
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    isKnockout: true,
    ...extra,
  });

  it("leaves the table untouched", () => {
    const table = computeStandings(teams, [match("a", "b", 2, 0), empty()]);
    const by = Object.fromEntries(table.map((r) => [r.teamId, r]));

    expect(by.a.played).toBe(1);
    expect(by.b.played).toBe(1);
    expect(by.c.played).toBe(0);
  });

  it("counts nothing even when it carries a score", () => {
    const table = computeStandings(teams, [
      empty({ homeScore: 3, awayScore: 1, status: "PLAYED", isKnockout: false }),
    ]);

    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it("does not break a tie in the head to head", () => {
    const table = computeStandings(teams, [
      match("a", "b", 1, 1),
      empty({ homeScore: 5, awayScore: 0, status: "PLAYED", isKnockout: false }),
    ]);
    const by = Object.fromEntries(table.map((r) => [r.teamId, r]));

    expect(by.a.points).toBe(1);
    expect(by.b.points).toBe(1);
  });
});

describe("a table ranked on parts", () => {
  const teams = [
    { id: "a", name: "أ" },
    { id: "b", name: "ب" },
    { id: "c", name: "ج" },
  ];

  function seriesMatch(
    a: string,
    b: string,
    sideAHalves: number,
    sideBHalves: number,
    over = true,
  ) {
    return {
      firstTeam: { id: a },
      secondTeam: { id: b },
      homeScore: null,
      awayScore: null,
      series: { sideAHalves, sideBHalves, over },
      status: "PLAYED",
      isKnockout: false,
    };
  }

  it("ranks on the parts each side took rather than on three for a win", () => {
    const rows = computeStandings(teams, [seriesMatch("a", "b", 3, 1)], true);

    expect(rows.find((r) => r.teamId === "a")!.points).toBe(3);
    expect(rows.find((r) => r.teamId === "b")!.points).toBe(1);
  });

  it("counts parts for, parts against and the difference between them", () => {
    const rows = computeStandings(teams, [seriesMatch("a", "b", 3, 1)], true);
    const first = rows.find((r) => r.teamId === "a")!;

    expect(first.scoredFor).toBe(3);
    expect(first.scoredAgainst).toBe(1);
    expect(first.difference).toBe(2);
  });

  it("carries a half through as a half rather than rounding it", () => {
    const rows = computeStandings(teams, [seriesMatch("a", "b", 1, 1)], true);

    expect(rows.find((r) => r.teamId === "a")!.points).toBe(1);
    expect(rows.find((r) => r.teamId === "a")!.drawn).toBe(1);
  });

  it("takes a side below nothing where a move drove it there", () => {
    const rows = computeStandings(teams, [seriesMatch("a", "b", 4, -4)], true);
    const second = rows.find((r) => r.teamId === "b")!;

    expect(second.points).toBe(-4);
    expect(second.difference).toBe(-8);
  });

  it("leaves out a match that is not over yet", () => {
    const rows = computeStandings(teams, [seriesMatch("a", "b", 2, 0, false)], true);

    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it("still ranks a football table on three for a win", () => {
    const rows = computeStandings(teams, [
      {
        firstTeam: { id: "a" },
        secondTeam: { id: "b" },
        homeScore: 2,
        awayScore: 1,
        status: "PLAYED",
        isKnockout: false,
      },
    ]);

    expect(rows.find((r) => r.teamId === "a")!.points).toBe(3);
  });
});
