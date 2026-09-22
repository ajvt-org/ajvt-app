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
