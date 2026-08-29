import { describe, it, expect } from "vitest";
import {
  goalRows,
  bookingRows,
  minuteLines,
  matchEventRows,
  memberTeamName,
  matchTimeline,
} from "./matchEvents";

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

    expect(rows[0].minutes).toEqual(["7' (ج)", "12' (ع)"]);
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

  it("puts the earliest scorer first however the goals arrive", () => {
    const rows = goalRows([
      goal({ memberId: "p2", fullName: "سالم ولد علي", minute: 44 }),
      goal({ minute: 10 }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["أسامه محمد", "سالم ولد علي"]);
  });

  it("orders a scorer by his first goal rather than his last", () => {
    const rows = goalRows([
      goal({ memberId: "p2", fullName: "سالم ولد علي", minute: 20 }),
      goal({ minute: 5 }),
      goal({ minute: 80 }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["أسامه محمد", "سالم ولد علي"]);
  });

  it("sends a scorer with no minute after the ones with one", () => {
    const rows = goalRows([
      goal({ memberId: "p2", fullName: "سالم ولد علي", minute: null }),
      goal({ minute: 60 }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["أسامه محمد", "سالم ولد علي"]);
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

  it("puts the earliest card first however the bookings arrive", () => {
    const rows = bookingRows([
      booking({ minute: 62 }),
      booking({ memberId: "p3", fullName: "محمد الأمين", minute: 12 }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["محمد الأمين", "سالم ولد علي"]);
  });

  it("sends a card with no minute after the ones with one", () => {
    const rows = bookingRows([
      booking({ minute: null }),
      booking({ memberId: "p3", fullName: "محمد الأمين", minute: 30 }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["محمد الأمين", "سالم ولد علي"]);
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
    expect(rows[2].name).toBe("أسامه محمد");
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

describe("memberTeamName", () => {
  const teams = [
    { name: "فريق النجم", members: [{ member: { id: "p1" } }] },
    { name: "فريق الشباب", members: [{ member: { id: "p2" } }] },
  ];

  it("names the team a player belongs to", () => {
    expect(memberTeamName("p2", teams)).toBe("فريق الشباب");
  });

  it("has no name for a player on neither roster", () => {
    expect(memberTeamName("p9", teams)).toBeNull();
  });

  it("has no name when there is no player", () => {
    expect(memberTeamName(null, teams)).toBeNull();
  });
});

describe("the man of the match row", () => {
  const player = { id: "p1", fullName: "أسامه محمد", photo: null };

  it("carries the team so the card can say who he played for", () => {
    const rows = matchEventRows({
      goals: [],
      bookings: [],
      manOfTheMatch: player,
      manOfTheMatchTeam: "فريق النجم",
    });

    expect(rows[0].team).toBe("فريق النجم");
  });

  it("leaves the team out when it is not known", () => {
    const rows = matchEventRows({ goals: [], bookings: [], manOfTheMatch: player });

    expect(rows[0].team).toBeNull();
  });
});

describe("matchTimeline", () => {
  const player = { id: "p1", fullName: "أسامه محمد", photo: null };
  const other = { id: "p2", fullName: "سالم ولد علي", photo: null };

  it("runs the events in the order they happened", () => {
    const entries = matchTimeline({
      homeTeamId: "t1",
      goals: [
        { count: 1, minute: 44, kind: "GOAL", teamId: "t1", member: player },
        { count: 1, minute: 10, kind: "GOAL", teamId: "t2", member: other },
      ],
      bookings: [{ cardType: "YELLOW", minute: 31, teamId: "t1", member: player }],
    });

    expect(entries.map((e) => e.minute)).toEqual([10, 31, 44]);
    expect(entries.map((e) => e.type)).toEqual(["goal", "yellow", "goal"]);
  });

  it("keeps the yellows the card itself leaves out", () => {
    const entries = matchTimeline({
      goals: [],
      bookings: [{ cardType: "YELLOW", minute: 31, member: player }],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("yellow");
  });

  it("sends an event with no minute to the end", () => {
    const entries = matchTimeline({
      goals: [
        { count: 1, minute: null, kind: "GOAL", member: player },
        { count: 1, minute: 70, kind: "GOAL", member: other },
      ],
      bookings: [],
    });

    expect(entries.map((e) => e.minute)).toEqual([70, null]);
  });

  it("notes how a goal was scored and how many it was", () => {
    const entries = matchTimeline({
      goals: [
        { count: 1, minute: 12, kind: "PENALTY", member: player },
        { count: 2, minute: 40, kind: "GOAL", member: other },
      ],
      bookings: [],
    });

    expect(entries[0].note).toBe("(ج)");
    expect(entries[1].note).toBe(" (2)");
  });

  it("names the side each event belongs to", () => {
    const entries = matchTimeline({
      homeTeamId: "t1",
      goals: [{ count: 1, minute: 12, kind: "GOAL", teamId: "t2", member: player }],
      bookings: [],
    });

    expect(entries[0].side).toBe("away");
  });
});

describe("a forfeited match, seen from outside", () => {
  const player = (id: string) => ({ id, fullName: id, photo: null });
  const match = {
    homeTeamId: "home",
    goals: [
      { count: 1, minute: 10, kind: "GOAL", teamId: "home", member: player("winner") },
      { count: 1, minute: 20, kind: "GOAL", teamId: "away", member: player("loser") },
    ],
    bookings: [{ cardType: "YELLOW", minute: 30, teamId: "away", member: player("booked") }],
  };

  it("shows both scorers while nothing is hidden", () => {
    expect(matchEventRows(match).map((r) => r.name)).toContain("loser");
  });

  it("drops the forfeiting side's goals from the rows", () => {
    const rows = matchEventRows({ ...match, hideGoalsOfTeamId: "away" });

    expect(rows.map((r) => r.name)).toContain("winner");
    expect(rows.map((r) => r.name)).not.toContain("loser");
  });

  it("drops them from the timeline too", () => {
    const entries = matchTimeline({ ...match, hideGoalsOfTeamId: "away" });

    expect(entries.filter((e) => e.type === "goal").map((e) => e.name)).toEqual(["winner"]);
  });

  it("keeps the cards, which a forfeit does not annul", () => {
    const rows = matchEventRows({ ...match, hideGoalsOfTeamId: "away" });
    const entries = matchTimeline({ ...match, hideGoalsOfTeamId: "away" });

    expect(rows.map((r) => r.name)).toContain("booked");
    expect(entries.map((e) => e.type)).toContain("yellow");
  });
});
