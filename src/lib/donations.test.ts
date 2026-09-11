import { describe, it, expect } from "vitest";
import { validatePaidAmount } from "./donations";

const FEE = 250;

describe("validatePaidAmount", () => {
  it("accepts the fee it was given and anything above it", () => {
    expect(validatePaidAmount(FEE, FEE)).toBeNull();
    expect(validatePaidAmount(FEE + 1, FEE)).toBeNull();
    expect(validatePaidAmount(5000, FEE)).toBeNull();
  });

  it("accepts numeric strings, since form inputs arrive as strings", () => {
    expect(validatePaidAmount(String(FEE), FEE)).toBeNull();
    expect(validatePaidAmount("2000", FEE)).toBeNull();
  });

  it("rejects anything below the fee it was given", () => {
    expect(validatePaidAmount(FEE - 1, FEE)).not.toBeNull();
    expect(validatePaidAmount(0, FEE)).not.toBeNull();
    expect(validatePaidAmount(-500, FEE)).not.toBeNull();
  });

  it("answers to the fee it was given rather than to any compiled in number", () => {
    expect(validatePaidAmount(150, 100)).toBeNull();
    expect(validatePaidAmount(150, 200)).not.toBeNull();
  });

  it("rejects non-integers", () => {
    expect(validatePaidAmount(100.5, FEE)).not.toBeNull();
    expect(validatePaidAmount("abc", FEE)).not.toBeNull();
    expect(validatePaidAmount(null, FEE)).not.toBeNull();
    expect(validatePaidAmount(undefined, FEE)).not.toBeNull();
    expect(validatePaidAmount("", FEE)).not.toBeNull();
    expect(validatePaidAmount(NaN, FEE)).not.toBeNull();
    expect(validatePaidAmount(Infinity, FEE)).not.toBeNull();
  });

  it("names the minimum in the message, so the member knows what to enter", () => {
    expect(validatePaidAmount(0, FEE)).toContain(String(FEE));
  });
});
