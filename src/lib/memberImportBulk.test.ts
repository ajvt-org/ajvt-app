import { describe, it, expect } from "vitest";
import { PAYMENT_METHODS } from "./donations";
import { bulkChange, bulkSurplus } from "./memberImportBulk";

const AGE = "الأولى";
const METHOD = PAYMENT_METHODS[0];
const FEE = 100;

function fill(over: Partial<Parameters<typeof bulkChange>[0]> = {}) {
  return { age: "", paymentMethod: "", paidAmount: "", ...over };
}

describe("bulkChange", () => {
  it("fills nothing when no field was answered", () => {
    expect(bulkChange(fill())).toEqual({});
  });

  it("fills the age group on its own without touching the payment", () => {
    expect(bulkChange(fill({ age: AGE }))).toEqual({ age: AGE });
  });

  it("marks the rows paid once a method is chosen", () => {
    expect(bulkChange(fill({ paymentMethod: METHOD }))).toEqual({
      paid: true,
      paymentMethod: METHOD,
      paidAmount: "",
    });
  });

  it("keeps a blank amount blank, so the fee applies when the row is imported", () => {
    expect(bulkChange(fill({ paymentMethod: METHOD, paidAmount: "  " })).paidAmount).toBe("");
  });

  it("ignores an amount typed with no method", () => {
    expect(bulkChange(fill({ paidAmount: "500" }))).toEqual({});
  });

  it("carries the age group and the payment together", () => {
    expect(bulkChange(fill({ age: AGE, paymentMethod: METHOD, paidAmount: "500" }))).toEqual({
      age: AGE,
      paid: true,
      paymentMethod: METHOD,
      paidAmount: "500",
    });
  });
});

describe("bulkSurplus", () => {
  it("finds nothing above the fee for a blank or exact amount", () => {
    expect(bulkSurplus("", FEE)).toBe(0);
    expect(bulkSurplus(String(FEE), FEE)).toBe(0);
  });

  it("finds nothing for an amount below the fee", () => {
    expect(bulkSurplus(String(FEE - 1), FEE)).toBe(0);
  });

  it("finds what would land on the supporters board", () => {
    expect(bulkSurplus(String(FEE * 3), FEE)).toBe(FEE * 2);
  });

  it("finds nothing in an amount that is not a whole number", () => {
    expect(bulkSurplus("abc", FEE)).toBe(0);
    expect(bulkSurplus("150.5", FEE)).toBe(0);
  });
});
