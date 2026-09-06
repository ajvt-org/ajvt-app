import { describe, it, expect } from "vitest";
import {
  splitFixtures,
  sortUpcoming,
  sortPast,
  nextFixture,
  emptyReason,
  type Fixture,
} from "@/lib/memberFixtures";

function fixture(over: Partial<Fixture> = {}): Fixture {
  return {
    id: "m1",
    matchDate: "2026-03-10T15:00:00.000Z",
    round: null,
    venue: null,
    status: "SCHEDULED",
    isKnockout: false,
    firstTeam: { id: "t1", name: "الأزرق" },
    secondTeam: { id: "t2", name: "النجوم" },
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    activity: { id: "a1", title: "البطولة الكبرى" },
    myTeamId: "t1",
    ...over,
  };
}

describe("splitFixtures", () => {
  it("puts played matches in the past and the rest ahead", () => {
    const { upcoming, past } = splitFixtures([
      fixture({ id: "a", status: "PLAYED" }),
      fixture({ id: "b", status: "SCHEDULED" }),
    ]);

    expect(upcoming.map((f) => f.id)).toEqual(["b"]);
    expect(past.map((f) => f.id)).toEqual(["a"]);
  });
});

describe("sortUpcoming", () => {
  it("orders by date, soonest first", () => {
    const sorted = sortUpcoming([
      fixture({ id: "late", matchDate: "2026-03-20T15:00:00.000Z" }),
      fixture({ id: "soon", matchDate: "2026-03-11T15:00:00.000Z" }),
    ]);

    expect(sorted.map((f) => f.id)).toEqual(["soon", "late"]);
  });

  it("keeps undated fixtures, and puts them last", () => {
    const sorted = sortUpcoming([
      fixture({ id: "undated", matchDate: null }),
      fixture({ id: "dated", matchDate: "2026-03-11T15:00:00.000Z" }),
    ]);

    expect(sorted.map((f) => f.id)).toEqual(["dated", "undated"]);
  });
});

describe("sortPast", () => {
  it("orders by date, most recent first", () => {
    const sorted = sortPast([
      fixture({ id: "older", matchDate: "2026-03-01T15:00:00.000Z", status: "PLAYED" }),
      fixture({ id: "newer", matchDate: "2026-03-09T15:00:00.000Z", status: "PLAYED" }),
    ]);

    expect(sorted.map((f) => f.id)).toEqual(["newer", "older"]);
  });
});

describe("nextFixture", () => {
  it("is the soonest match still to play", () => {
    const next = nextFixture([
      fixture({ id: "done", status: "PLAYED", matchDate: "2026-03-01T15:00:00.000Z" }),
      fixture({ id: "next", matchDate: "2026-03-11T15:00:00.000Z" }),
      fixture({ id: "later", matchDate: "2026-03-20T15:00:00.000Z" }),
    ]);

    expect(next?.id).toBe("next");
  });

  it("is an undated fixture when that is all there is", () => {
    expect(nextFixture([fixture({ id: "semi", matchDate: null })])?.id).toBe("semi");
  });

  it("is nothing when every match has been played", () => {
    expect(nextFixture([fixture({ status: "PLAYED" })])).toBeNull();
  });
});

describe("emptyReason", () => {
  it("tells being in no team apart from having no fixtures", () => {
    expect(emptyReason(0)).toBe("NO_TEAM");
    expect(emptyReason(2)).toBe("NO_FIXTURES");
  });
});
