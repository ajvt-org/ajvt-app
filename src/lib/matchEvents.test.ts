import { describe, it, expect } from "vitest";
import { goalRows, bookingRows, minuteLines, matchEventRows } from "./matchEvents";

function goal(over: Partial<Parameters<typeof goalRows>[0][number]> = {}) {
  return {
    memberId: "p1",
    fullName: "أسامه محمد",
    photo: null,
    count: 1,
    minute: 7,
    kind: "GOAL" as const,
    ...over,
  };
}

describe("goalRows", () => {
  it("gathers a player's goals into one row of minutes", () => {
    const rows = goalRows([goal(), goal({ minute: 30 })]);

    expect(rows).toHaveLength(1);
    expect(rows[0].minutes).toEqual(["7'", "30'"]);
  });

  it("orders the minutes even when the goals arrive out of order", () => {
    const rows = goalRows([goal({ minute: 30 }), goal({ minute: 7 })]);

    expect(rows[0].minutes).toEqual(["7'", "30'"]);
  });

  it("marks how a goal was scored next to its minute", () => {
    const rows = goalRows([goal({ kind: "PENALTY" }), goal({ minute: 12, kind: "OWN_GOAL" })]);

    expect(rows[0].minutes).toEqual(["7' (ج)", "12' (عكسي)"]);
  });

  it("falls back to a tally when the minutes were never recorded", () => {
    const rows = goalRows([goal({ minute: null, count: 2 })]);

    expect(rows[0].minutes).toEqual(["(2)"]);
  });

  it("keeps the known minute and tallies the rest of a multiple-goal row", () => {
    const rows = goalRows([goal({ count: 3 })]);

    expect(rows[0].minutes).toEqual(["7'", "(3)"]);
  });

  it("keeps two unknown scorers apart from a named one", () => {
    const rows = goalRows([goal(), goal({ memberId: null, fullName: "مجهول" })]);

    expect(rows).toHaveLength(2);
  });
});

describe("bookingRows", () => {
  function booking(over = {}) {
    return {
      memberId: "p2",
      fullName: "سالم ولد علي",
      photo: null,
      cardType: "YELLOW" as const,
      minute: 40,
      ...over,
    };
  }

  it("splits a player's yellow from the red that followed it", () => {
    const rows = bookingRows([booking(), booking({ cardType: "RED" as const, minute: 70 })]);

    expect(rows.map((r) => r.type)).toEqual(["yellow", "red"]);
  });

  it("gathers two yellows into one row", () => {
    const rows = bookingRows([booking(), booking({ minute: 55 })]);

    expect(rows).toHaveLength(1);
    expect(rows[0].minutes).toEqual(["40'", "55'"]);
  });

  it("leaves the minutes out when none was recorded", () => {
    const rows = bookingRows([booking({ minute: null })]);

    expect(rows[0].minutes).toEqual([]);
  });
});

describe("minuteLines", () => {
  it("breaks the minutes into rows of two", () => {
    expect(minuteLines(["7'", "30'", "45'", "60'", "88'"])).toEqual([
      ["7'", "30'"],
      ["45'", "60'"],
      ["88'"],
    ]);
  });

  it("has nothing to break when there are no minutes", () => {
    expect(minuteLines([])).toEqual([]);
  });
});

describe("matchEventRows", () => {
  const player = { id: "p1", fullName: "أسامه محمد", photo: null };

  it("reads goals, cards and the man of the match in that order", () => {
    const rows = matchEventRows({
      goals: [{ count: 1, minute: 7, kind: "GOAL", member: player }],
      bookings: [
        { cardType: "YELLOW", minute: 40, member: { id: "p2", fullName: "سالم", photo: null } },
      ],
      manOfTheMatch: player,
    });

    expect(rows.map((r) => r.type)).toEqual(["goal", "yellow", "motm"]);
    expect(rows[2].name).toContain("رجل المباراة");
  });

  it("names an unknown scorer rather than leaving the row blank", () => {
    const rows = matchEventRows({
      goals: [{ count: 1, minute: null, kind: "GOAL", member: null }],
      bookings: [],
    });

    expect(rows[0].name).toBe("مجهول");
  });

  it("has no rows for a match nothing happened in", () => {
    expect(matchEventRows({ goals: [], bookings: [], manOfTheMatch: null })).toEqual([]);
  });
});

describe("sides", () => {
  const home = { id: "h1", fullName: "لاعب المضيف", photo: null };
  const away = { id: "a1", fullName: "لاعب الضيف", photo: null };

  it("reads a goal's side from the team it counts for", () => {
    const rows = matchEventRows({
      homeTeamId: "t1",
      goals: [
        { count: 1, minute: 10, kind: "GOAL", teamId: "t1", member: home },
        { count: 1, minute: 20, kind: "GOAL", teamId: "t2", member: away },
      ],
      bookings: [],
    });

    expect(rows.map((r) => r.side)).toEqual(["home", "away"]);
  });

  it("leaves every row sideless when the match does not say who is home", () => {
    const rows = matchEventRows({
      goals: [{ count: 1, minute: 10, kind: "GOAL", teamId: "t1", member: home }],
      bookings: [],
    });

    expect(rows[0].side).toBeNull();
  });

  it("keeps the same player's goals for two teams apart", () => {
    const rows = matchEventRows({
      homeTeamId: "t1",
      goals: [
        { count: 1, minute: 10, kind: "GOAL", teamId: "t1", member: home },
        { count: 1, minute: 20, kind: "OWN_GOAL", teamId: "t2", member: home },
      ],
      bookings: [],
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.side)).toEqual(["home", "away"]);
  });

  it("gives the man of the match no side of his own", () => {
    const rows = matchEventRows({
      homeTeamId: "t1",
      goals: [],
      bookings: [],
      manOfTheMatch: home,
    });

    expect(rows[0].side).toBeNull();
  });
});
