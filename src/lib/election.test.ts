import { describe, it, expect } from "vitest";
import {
  endsAt,
  electionState,
  msUntilStart,
  msUntilEnd,
  leader,
  validElectionMinutes,
  ELECTION_MINUTES_MIN,
  ELECTION_MINUTES_MAX,
  stillWorthShowing,
  orderForReader,
  percentOf,
  rankedTally,
  closingSoon,
  closeMoveProblem,
} from "./election";

const at = (iso: string) => new Date(iso);

const election = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 120 };

describe("endsAt", () => {
  it("puts the close a duration after the start", () => {
    expect(endsAt(election).toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });

  it("reads a start that arrives as a string", () => {
    expect(endsAt({ startsAt: "2026-10-01T08:00:00Z", durationMinutes: 60 }).toISOString()).toBe(
      "2026-10-01T09:00:00.000Z",
    );
  });
});

describe("electionState", () => {
  it("is upcoming before the start", () => {
    expect(electionState(election, at("2026-10-01T07:59:59Z"))).toBe("upcoming");
  });

  it("opens on the start itself", () => {
    expect(electionState(election, at("2026-10-01T08:00:00Z"))).toBe("open");
  });

  it("is open inside the window", () => {
    expect(electionState(election, at("2026-10-01T09:30:00Z"))).toBe("open");
  });

  it("ends on the close itself rather than a moment after", () => {
    expect(electionState(election, at("2026-10-01T10:00:00Z"))).toBe("ended");
  });

  it("stays ended long afterwards", () => {
    expect(electionState(election, at("2027-01-01T00:00:00Z"))).toBe("ended");
  });
});

describe("msUntilStart", () => {
  it("counts down toward the opening", () => {
    expect(msUntilStart(election, at("2026-10-01T07:50:00Z"))).toBe(600_000);
  });

  it("never goes below zero once the window is open", () => {
    expect(msUntilStart(election, at("2026-10-01T09:00:00Z"))).toBe(0);
  });
});

describe("msUntilEnd", () => {
  it("counts down toward the close", () => {
    expect(msUntilEnd(election, at("2026-10-01T09:50:00Z"))).toBe(600_000);
  });

  it("never goes below zero once the window has closed", () => {
    expect(msUntilEnd(election, at("2026-10-02T00:00:00Z"))).toBe(0);
  });
});

describe("validElectionMinutes", () => {
  it("accepts the floor and the ceiling", () => {
    expect(validElectionMinutes(ELECTION_MINUTES_MIN)).toBe(true);
    expect(validElectionMinutes(ELECTION_MINUTES_MAX)).toBe(true);
  });

  it("refuses a duration under the floor", () => {
    expect(validElectionMinutes(0)).toBe(false);
    expect(validElectionMinutes(-60)).toBe(false);
  });

  it("refuses a duration over the ceiling", () => {
    expect(validElectionMinutes(ELECTION_MINUTES_MAX + 1)).toBe(false);
  });

  it("refuses anything that is not a whole number of minutes", () => {
    expect(validElectionMinutes(90.5)).toBe(false);
    expect(validElectionMinutes("ساعة")).toBe(false);
    expect(validElectionMinutes(null)).toBe(false);
  });
});

describe("leader", () => {
  it("names the candidate standing alone at the top", () => {
    expect(
      leader([
        { candidateId: "a", votes: 5 },
        { candidateId: "b", votes: 3 },
      ]),
    ).toBe("a");
  });

  it("names nobody on a tie", () => {
    expect(
      leader([
        { candidateId: "a", votes: 4 },
        { candidateId: "b", votes: 4 },
      ]),
    ).toBeNull();
  });

  it("names nobody when no candidate has a vote", () => {
    expect(
      leader([
        { candidateId: "a", votes: 0 },
        { candidateId: "b", votes: 0 },
      ]),
    ).toBeNull();
  });

  it("never names the blank, however many blanks were cast", () => {
    expect(
      leader([
        { candidateId: null, votes: 9 },
        { candidateId: "a", votes: 2 },
      ]),
    ).toBe("a");
  });

  it("names nobody when the blank is the only answer given", () => {
    expect(leader([{ candidateId: null, votes: 7 }])).toBeNull();
  });

  it("names nobody on an empty tally", () => {
    expect(leader([])).toBeNull();
  });
});

describe("stillWorthShowing", () => {
  const ended = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 60 };

  it("keeps an election that has not started", () => {
    expect(stillWorthShowing(election, at("2026-09-30T00:00:00Z"))).toBe(true);
  });

  it("keeps an election still open", () => {
    expect(stillWorthShowing(election, at("2026-10-01T09:00:00Z"))).toBe(true);
  });

  it("keeps a result the association only just read", () => {
    expect(stillWorthShowing(ended, at("2026-10-20T09:00:00Z"))).toBe(true);
  });

  it("drops a result nobody is still reading", () => {
    expect(stillWorthShowing(ended, at("2026-12-01T09:00:00Z"))).toBe(false);
  });
});

describe("orderForReader", () => {
  const now = at("2026-10-05T12:00:00Z");
  const named = <T extends { id: string }>(rows: T[]) => rows.map((row) => row.id);

  it("puts what is open first, by the soonest close", () => {
    const rows = [
      { id: "closes-late", startsAt: at("2026-10-05T08:00:00Z"), durationMinutes: 600 },
      { id: "closes-soon", startsAt: at("2026-10-05T08:00:00Z"), durationMinutes: 300 },
    ];

    expect(named(orderForReader(rows, now))).toEqual(["closes-soon", "closes-late"]);
  });

  it("puts what is coming next, by the soonest start", () => {
    const rows = [
      { id: "later", startsAt: at("2026-10-20T08:00:00Z"), durationMinutes: 60 },
      { id: "sooner", startsAt: at("2026-10-06T08:00:00Z"), durationMinutes: 60 },
    ];

    expect(named(orderForReader(rows, now))).toEqual(["sooner", "later"]);
  });

  it("puts what has ended last, the most recent first", () => {
    const rows = [
      { id: "older", startsAt: at("2026-09-01T08:00:00Z"), durationMinutes: 60 },
      { id: "newer", startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 60 },
    ];

    expect(named(orderForReader(rows, now))).toEqual(["newer", "older"]);
  });

  it("reads open, then upcoming, then ended, whatever order it was given", () => {
    const rows = [
      { id: "ended", startsAt: at("2026-09-01T08:00:00Z"), durationMinutes: 60 },
      { id: "upcoming", startsAt: at("2026-10-20T08:00:00Z"), durationMinutes: 60 },
      { id: "open", startsAt: at("2026-10-05T08:00:00Z"), durationMinutes: 600 },
    ];

    expect(named(orderForReader(rows, now))).toEqual(["open", "upcoming", "ended"]);
  });

  it("leaves what it was given alone", () => {
    const rows = [
      { id: "ended", startsAt: at("2026-09-01T08:00:00Z"), durationMinutes: 60 },
      { id: "open", startsAt: at("2026-10-05T08:00:00Z"), durationMinutes: 600 },
    ];

    orderForReader(rows, now);

    expect(named(rows)).toEqual(["ended", "open"]);
  });
});

describe("percentOf", () => {
  it("reads a share as a whole number", () => {
    expect(percentOf(1, 4)).toBe(25);
    expect(percentOf(2, 3)).toBe(67);
  });

  it("is nothing when nothing has been cast", () => {
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(5, 0)).toBe(0);
  });

  it("is everything when every ballot went one way", () => {
    expect(percentOf(7, 7)).toBe(100);
  });
});

describe("rankedTally", () => {
  it("reads the candidates by count, the biggest first", () => {
    const rows = [
      { candidateId: "a", votes: 2 },
      { candidateId: "b", votes: 9 },
      { candidateId: "c", votes: 5 },
    ];

    expect(rankedTally(rows).map((row) => row.candidateId)).toEqual(["b", "c", "a"]);
  });

  it("puts the blank last however many blanks were cast", () => {
    const rows = [
      { candidateId: null, votes: 40 },
      { candidateId: "a", votes: 2 },
      { candidateId: "b", votes: 1 },
    ];

    expect(rankedTally(rows).map((row) => row.candidateId)).toEqual(["a", "b", null]);
  });

  it("leaves the rows it was given alone", () => {
    const rows = [
      { candidateId: "a", votes: 1 },
      { candidateId: "b", votes: 9 },
    ];

    rankedTally(rows);

    expect(rows.map((row) => row.candidateId)).toEqual(["a", "b"]);
  });

  it("answers an empty tally with an empty one", () => {
    expect(rankedTally([])).toEqual([]);
  });
});

describe("closingSoon", () => {
  const quarter = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 15 };

  it("stays calm while more than a tenth of the window is left", () => {
    expect(closingSoon(quarter, at("2026-10-01T08:13:29Z"))).toBe(false);
  });

  it("warns once less than a tenth of the window is left", () => {
    expect(closingSoon(quarter, at("2026-10-01T08:13:31Z"))).toBe(true);
  });

  it("measures the tenth against the election's own window", () => {
    const week = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 10080 };

    expect(closingSoon(week, at("2026-10-07T14:00:00Z"))).toBe(false);
    expect(closingSoon(week, at("2026-10-07T16:00:00Z"))).toBe(true);
  });

  it("never warns before the vote opens or after it closes", () => {
    expect(closingSoon(quarter, at("2026-10-01T07:59:00Z"))).toBe(false);
    expect(closingSoon(quarter, at("2026-10-01T08:20:00Z"))).toBe(false);
  });
});

describe("a close moment of its own", () => {
  const ranADay = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 1440 };
  const reopened = { ...ranADay, closesAt: at("2026-10-04T09:00:00Z") };

  it("wins over the start plus the duration", () => {
    expect(endsAt(reopened)).toEqual(at("2026-10-04T09:00:00Z"));
    expect(endsAt({ ...reopened, closesAt: "2026-10-04T09:00:00Z" })).toEqual(
      at("2026-10-04T09:00:00Z"),
    );
  });

  it("falls back to the start plus the duration when it is not set", () => {
    expect(endsAt({ ...ranADay, closesAt: null })).toEqual(at("2026-10-02T08:00:00Z"));
    expect(endsAt(ranADay)).toEqual(at("2026-10-02T08:00:00Z"));
  });

  it("reopens a vote that had ended", () => {
    const now = at("2026-10-04T08:00:00Z");

    expect(electionState(ranADay, now)).toBe("ended");
    expect(electionState(reopened, now)).toBe("open");
    expect(msUntilEnd(reopened, now)).toBe(3600_000);
  });

  it("keeps a reopened vote on screen and counts its tenth from the new close", () => {
    expect(stillWorthShowing(reopened, at("2026-10-20T08:00:00Z"))).toBe(true);
    expect(closingSoon(reopened, at("2026-10-04T01:00:00Z"))).toBe(false);
    expect(closingSoon(reopened, at("2026-10-04T08:00:00Z"))).toBe(true);
  });
});

describe("closeMoveProblem", () => {
  const ranAnHour = { startsAt: at("2026-10-01T08:00:00Z"), durationMinutes: 60 };

  it("lets an open vote run longer", () => {
    expect(
      closeMoveProblem(ranAnHour, at("2026-10-01T10:00:00Z"), at("2026-10-01T08:30:00Z")),
    ).toBe(null);
  });

  it("lets a finished vote reopen", () => {
    expect(
      closeMoveProblem(ranAnHour, at("2026-10-03T10:00:00Z"), at("2026-10-03T09:00:00Z")),
    ).toBe(null);
  });

  it("leaves a vote that has not started to its own settings", () => {
    expect(
      closeMoveProblem(ranAnHour, at("2026-10-01T12:00:00Z"), at("2026-10-01T07:00:00Z")),
    ).toBe("notStarted");
  });

  it("never moves the close inward", () => {
    const now = at("2026-10-01T08:30:00Z");

    expect(closeMoveProblem(ranAnHour, at("2026-10-01T08:45:00Z"), now)).toBe("notLater");
    expect(closeMoveProblem(ranAnHour, at("2026-10-01T09:00:00Z"), now)).toBe("notLater");
  });

  it("measures inward against a close that already moved", () => {
    const moved = { ...ranAnHour, closesAt: at("2026-10-01T12:00:00Z") };

    expect(closeMoveProblem(moved, at("2026-10-01T11:00:00Z"), at("2026-10-01T08:30:00Z"))).toBe(
      "notLater",
    );
  });

  it("refuses a new close that is already behind the clock", () => {
    expect(
      closeMoveProblem(ranAnHour, at("2026-10-02T08:00:00Z"), at("2026-10-03T08:00:00Z")),
    ).toBe("notFuture");
  });
});
