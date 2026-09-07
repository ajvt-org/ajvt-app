import { describe, it, expect } from "vitest";
import {
  canEnd,
  canRestore,
  endingRefusal,
  isEndingReason,
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

  it("refuses a reason a proof is turned down for", () => {
    for (const reason of REJECTION_REASONS) {
      expect(isEndingReason(reason)).toBe(false);
    }
  });

  it("refuses free text and anything that is not a string", () => {
    expect(isEndingReason("سبب من عندي")).toBe(false);
    expect(isEndingReason("")).toBe(false);
    expect(isEndingReason(null)).toBe(false);
    expect(isEndingReason(7)).toBe(false);
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
