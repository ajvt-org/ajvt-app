import { describe, it, expect } from "vitest";
import { amountConsequence } from "./membershipShortfall";
import { AMOUNT_BELOW_FEE } from "./texts";

const STANDING = { status: "ACTIVE", endedAt: null, endedReason: null };

describe("what correcting an amount does to the membership behind it", () => {
  it("puts an active membership in reach of ending when the amount falls short", () => {
    expect(amountConsequence(40, 100, STANDING)).toBe("endable");
  });

  it("leaves a membership nobody has accepted alone", () => {
    expect(amountConsequence(40, 100, { ...STANDING, status: "PENDING" })).toBeNull();
    expect(amountConsequence(40, 100, { ...STANDING, status: "REJECTED" })).toBeNull();
  });

  it("has nothing to end where the membership is already ended", () => {
    expect(
      amountConsequence(40, 100, {
        status: "ACTIVE",
        endedAt: new Date("2026-09-01"),
        endedReason: AMOUNT_BELOW_FEE,
      }),
    ).toBeNull();
  });

  it("reads an amount back at the fee as a membership that can come back", () => {
    expect(
      amountConsequence(100, 100, {
        status: "ACTIVE",
        endedAt: new Date("2026-09-01"),
        endedReason: AMOUNT_BELOW_FEE,
      }),
    ).toBe("restorable");
  });

  it("leaves a membership ended for another reason where it is", () => {
    expect(
      amountConsequence(300, 100, {
        status: "ACTIVE",
        endedAt: new Date("2026-09-01"),
        endedReason: "مخالفة النظام الداخلي",
      }),
    ).toBeNull();
  });

  it("asks for nothing where the amount covers the fee and nothing was ended", () => {
    expect(amountConsequence(100, 100, STANDING)).toBeNull();
    expect(amountConsequence(500, 100, STANDING)).toBeNull();
  });
});
