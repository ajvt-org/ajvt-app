import { describe, it, expect } from "vitest";
import { membershipState, needsAttention, type StatefulMembership } from "./membershipState";

const YEAR = 2026;

const member = (over: Partial<StatefulMembership> = {}): StatefulMembership => ({
  status: "ACTIVE",
  membershipYear: YEAR,
  endedAt: null,
  ...over,
});

describe("membershipState", () => {
  it("calls an account with nothing behind it not a member", () => {
    expect(membershipState(null, YEAR)).toBe("NOT_A_MEMBER");
    expect(membershipState(undefined, YEAR)).toBe("NOT_A_MEMBER");
  });

  it("holds an application under review, whatever year it is for", () => {
    expect(membershipState(member({ status: "PENDING" }), YEAR)).toBe("APPLIED");
    expect(membershipState(member({ status: "PENDING", membershipYear: 2020 }), YEAR)).toBe(
      "APPLIED",
    );
  });

  it("keeps a refused application its own state, not a kind of never applied", () => {
    expect(membershipState(member({ status: "REJECTED" }), YEAR)).toBe("APPLICATION_REFUSED");
  });

  it("is up to date on the year being collected", () => {
    expect(membershipState(member(), YEAR)).toBe("UP_TO_DATE");
  });

  it("counts a year paid in advance as up to date, not behind", () => {
    expect(membershipState(member({ membershipYear: 2027 }), YEAR)).toBe("UP_TO_DATE");
  });

  it("is behind on an accepted payment for an earlier year", () => {
    expect(membershipState(member({ membershipYear: 2025 }), YEAR)).toBe("BEHIND");
  });

  it("reads a membership an admin ended as ended", () => {
    expect(membershipState(member({ endedAt: new Date("2026-06-01") }), YEAR)).toBe("ENDED");
  });

  it("reads an ending that arrived as a string the same way", () => {
    expect(membershipState(member({ endedAt: "2026-06-01T00:00:00.000Z" }), YEAR)).toBe("ENDED");
  });

  it("still reads an ended year older than the running one as ended", () => {
    expect(
      membershipState(member({ membershipYear: 2025, endedAt: new Date("2025-06-01") }), YEAR),
    ).toBe("ENDED");
  });

  it("leaves the verdict on the proof ahead of the ending", () => {
    expect(membershipState(member({ status: "PENDING", endedAt: new Date() }), YEAR)).toBe(
      "APPLIED",
    );
    expect(membershipState(member({ status: "REJECTED", endedAt: new Date() }), YEAR)).toBe(
      "APPLICATION_REFUSED",
    );
  });

  it("has something to say in every state but the paid-up one", () => {
    expect(needsAttention("UP_TO_DATE")).toBe(false);
    for (const state of [
      "NOT_A_MEMBER",
      "APPLIED",
      "APPLICATION_REFUSED",
      "BEHIND",
      "ENDED",
    ] as const) {
      expect(needsAttention(state)).toBe(true);
    }
  });
});
