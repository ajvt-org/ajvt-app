import { describe, it, expect } from "vitest";
import { money, moneyDigits } from "@/lib/money";

describe("the digits of an amount", () => {
  it("groups thousands the way the receipt does", () => {
    expect(moneyDigits(5000)).toBe("5.000");
    expect(moneyDigits(500)).toBe("500");
    expect(moneyDigits(1000000)).toBe("1.000.000");
    expect(moneyDigits(0)).toBe("0");
  });

  it("keeps a negative readable", () => {
    expect(moneyDigits(-1500)).toBe("-1.500");
  });

  it("drops a fraction rather than rounding it into the figure", () => {
    expect(moneyDigits(1500.9)).toBe("1.500");
  });
});

describe("an amount with its currency", () => {
  it("puts the currency word after the digits, one space apart", () => {
    expect(money(5000)).toBe("5.000 أوقية");
    expect(money(1)).toBe("1 أوقية");
  });

  it("keeps the currency word invariant, whatever the count", () => {
    for (const value of [0, 1, 2, 3, 11, 100, 5000]) {
      expect(money(value).endsWith(" أوقية")).toBe(true);
    }
  });
});
