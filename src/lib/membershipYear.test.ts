import { describe, it, expect } from "vitest";
import {
  FIRST_MEMBERSHIP_YEAR,
  isMembershipYear,
  membershipYears,
  resolveMembershipYear,
  runningYear,
  yearBounds,
} from "@/lib/membershipYear";

const IN_2026 = new Date("2026-06-01T00:00:00Z");

describe("runningYear", () => {
  it("reads the year in UTC, which is the club's own clock", () => {
    expect(runningYear(IN_2026)).toBe(2026);
    expect(runningYear(new Date("2026-12-31T23:30:00Z"))).toBe(2026);
  });
});

describe("yearBounds", () => {
  it("opens next year so a campaign can be set up before it starts", () => {
    expect(yearBounds(IN_2026)).toEqual({ min: FIRST_MEMBERSHIP_YEAR, max: 2027 });
  });
});

describe("isMembershipYear", () => {
  it("accepts a year inside the bounds", () => {
    expect(isMembershipYear(2026, IN_2026)).toBe(true);
    expect(isMembershipYear(2027, IN_2026)).toBe(true);
    expect(isMembershipYear(FIRST_MEMBERSHIP_YEAR, IN_2026)).toBe(true);
  });

  it("refuses a year outside them", () => {
    expect(isMembershipYear(2028, IN_2026)).toBe(false);
    expect(isMembershipYear(FIRST_MEMBERSHIP_YEAR - 1, IN_2026)).toBe(false);
  });

  it("refuses anything that is not a whole year", () => {
    expect(isMembershipYear(2026.5, IN_2026)).toBe(false);
    expect(isMembershipYear("2026", IN_2026)).toBe(false);
    expect(isMembershipYear(null, IN_2026)).toBe(false);
    expect(isMembershipYear(undefined, IN_2026)).toBe(false);
  });
});

describe("resolveMembershipYear", () => {
  it("keeps a year the association has pinned", () => {
    expect(resolveMembershipYear(2025, IN_2026)).toBe(2025);
  });

  it("falls back to the running year when nothing is pinned", () => {
    expect(resolveMembershipYear(null, IN_2026)).toBe(2026);
    expect(resolveMembershipYear(undefined, IN_2026)).toBe(2026);
  });

  it("falls back rather than trusting a stored value that is out of bounds", () => {
    expect(resolveMembershipYear(1999, IN_2026)).toBe(2026);
  });
});

describe("membershipYears", () => {
  it("counts back from the current year, newest first", () => {
    expect(membershipYears(2022)).toEqual([2022, 2021, 2020]);
  });

  it("is never empty", () => {
    expect(membershipYears(FIRST_MEMBERSHIP_YEAR)).toEqual([FIRST_MEMBERSHIP_YEAR]);
  });
});
