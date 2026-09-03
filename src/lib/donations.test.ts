import { describe, it, expect } from "vitest";
import { validatePaidAmount, MEMBERSHIP_FEE } from "./donations";

describe("validatePaidAmount", () => {
  it("accepts the membership fee and anything above it", () => {
    expect(validatePaidAmount(MEMBERSHIP_FEE)).toBeNull();
    expect(validatePaidAmount(MEMBERSHIP_FEE + 1)).toBeNull();
    expect(validatePaidAmount(5000)).toBeNull();
  });

  it("accepts numeric strings, since form inputs arrive as strings", () => {
    expect(validatePaidAmount(String(MEMBERSHIP_FEE))).toBeNull();
    expect(validatePaidAmount("2000")).toBeNull();
  });

  it("rejects anything below the membership fee", () => {
    expect(validatePaidAmount(MEMBERSHIP_FEE - 1)).not.toBeNull();
    expect(validatePaidAmount(0)).not.toBeNull();
    expect(validatePaidAmount(-500)).not.toBeNull();
  });

  it("rejects non-integers", () => {
    expect(validatePaidAmount(100.5)).not.toBeNull();
    expect(validatePaidAmount("abc")).not.toBeNull();
    expect(validatePaidAmount(null)).not.toBeNull();
    expect(validatePaidAmount(undefined)).not.toBeNull();
    expect(validatePaidAmount("")).not.toBeNull();
    expect(validatePaidAmount(NaN)).not.toBeNull();
    expect(validatePaidAmount(Infinity)).not.toBeNull();
  });

  it("names the minimum in the message, so the member knows what to enter", () => {
    expect(validatePaidAmount(0)).toContain(String(MEMBERSHIP_FEE));
  });
});
