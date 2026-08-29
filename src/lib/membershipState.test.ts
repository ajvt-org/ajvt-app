import { describe, it, expect } from "vitest";
import { membershipState, needsAttention } from "./membershipState";

const YEAR = 2026;

describe("membershipState", () => {
  it("calls an account with no payment behind it exactly that", () => {
    expect(membershipState(null, YEAR)).toBe("NO_PAYMENT");
    expect(membershipState(undefined, YEAR)).toBe("NO_PAYMENT");
  });

  it("waits while a payment is under review, whatever year it is for", () => {
    expect(membershipState({ status: "PENDING", membershipYear: YEAR }, YEAR)).toBe(
      "AWAITING_REVIEW",
    );
    expect(membershipState({ status: "PENDING", membershipYear: 2020 }, YEAR)).toBe(
      "AWAITING_REVIEW",
    );
  });

  it("keeps a refusal its own state, not a kind of unpaid", () => {
    expect(membershipState({ status: "REJECTED", membershipYear: YEAR }, YEAR)).toBe("REFUSED");
  });

  it("is up to date on the year being collected", () => {
    expect(membershipState({ status: "ACTIVE", membershipYear: YEAR }, YEAR)).toBe("UP_TO_DATE");
  });

  it("counts a year paid in advance as up to date, not behind", () => {
    expect(membershipState({ status: "ACTIVE", membershipYear: 2027 }, YEAR)).toBe("UP_TO_DATE");
  });

  it("is behind on an accepted payment for an earlier year", () => {
    expect(membershipState({ status: "ACTIVE", membershipYear: 2025 }, YEAR)).toBe("BEHIND");
  });

  it("has something to say in every state but the paid-up one", () => {
    expect(needsAttention("UP_TO_DATE")).toBe(false);
    for (const state of ["NO_PAYMENT", "AWAITING_REVIEW", "REFUSED", "BEHIND"] as const) {
      expect(needsAttention(state)).toBe(true);
    }
  });
});
