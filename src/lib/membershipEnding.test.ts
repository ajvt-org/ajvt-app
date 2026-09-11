import { describe, it, expect } from "vitest";
import {
  canEnd,
  canRestore,
  endingRefusal,
  isEndingReason,
  MAX_ENDING_REASON,
  restoreRefusal,
} from "./membershipEnding";
import { MEMBERSHIP_ENDING_REASONS } from "./texts";
import { REJECTION_REASONS } from "./rejectionReasons";

describe("isEndingReason", () => {
  it("takes each of the reasons a membership ends for", () => {
    for (const reason of MEMBERSHIP_ENDING_REASONS) {
      expect(isEndingReason(reason)).toBe(true);
    }
  });

  it("keeps every offered reason inside the limit a written one has to meet", () => {
    for (const reason of MEMBERSHIP_ENDING_REASONS) {
      expect(reason.length).toBeLessThanOrEqual(MAX_ENDING_REASON);
    }
  });

  it("takes a reason an admin wrote, since the list cannot name every ending", () => {
    expect(isEndingReason("سبب من عندي")).toBe(true);
  });

  it("refuses a written reason that says nothing", () => {
    expect(isEndingReason("")).toBe(false);
    expect(isEndingReason("   ")).toBe(false);
    expect(isEndingReason("\n\t")).toBe(false);
  });

  it("refuses a written reason longer than a card can carry", () => {
    expect(isEndingReason("ب".repeat(MAX_ENDING_REASON))).toBe(true);
    expect(isEndingReason("ب".repeat(MAX_ENDING_REASON + 1))).toBe(false);
  });

  it("refuses anything that is not a string", () => {
    expect(isEndingReason(null)).toBe(false);
    expect(isEndingReason(undefined)).toBe(false);
    expect(isEndingReason(7)).toBe(false);
    expect(isEndingReason(["سبب"])).toBe(false);
  });
});

describe("endingRefusal", () => {
  it("lets a standing membership end", () => {
    expect(endingRefusal({ status: "ACTIVE", endedAt: null })).toBeNull();
    expect(canEnd({ status: "ACTIVE", endedAt: null })).toBe(true);
  });

  it("refuses a membership whose proof was never accepted", () => {
    expect(endingRefusal({ status: "PENDING", endedAt: null })).toBe("notStanding");
    expect(endingRefusal({ status: "REJECTED", endedAt: null })).toBe("notStanding");
  });

  it("refuses to end the same membership twice", () => {
    expect(endingRefusal({ status: "ACTIVE", endedAt: new Date() })).toBe("alreadyEnded");
    expect(canEnd({ status: "ACTIVE", endedAt: new Date() })).toBe(false);
  });
});

describe("restoreRefusal", () => {
  it("lets an ended membership come back", () => {
    expect(restoreRefusal({ status: "ACTIVE", endedAt: new Date() })).toBeNull();
    expect(canRestore({ status: "ACTIVE", endedAt: new Date() })).toBe(true);
  });

  it("has nothing to restore on a membership that still stands", () => {
    expect(restoreRefusal({ status: "ACTIVE", endedAt: null })).toBe("notEnded");
    expect(canRestore({ status: "ACTIVE", endedAt: null })).toBe(false);
  });
});

describe("the two lists of reasons", () => {
  it("share no wording, since a proof and a membership are turned down for different things", () => {
    const shared = MEMBERSHIP_ENDING_REASONS.filter((r) =>
      (REJECTION_REASONS as readonly string[]).includes(r),
    );

    expect(shared).toEqual([]);
  });
});
