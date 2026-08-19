import { describe, it, expect } from "vitest";
import { surplusOf } from "@/lib/membershipSurplus";

describe("what a member pays above the fee", () => {
  it("is nothing while the amount is the fee or below it", () => {
    expect(surplusOf(1000, 1000)).toBe(0);
    expect(surplusOf(400, 1000)).toBe(0);
  });

  it("is the rest once the amount rises above the fee", () => {
    expect(surplusOf(1500, 1000)).toBe(500);
  });

  it("reads the amount as the form holds it, a string", () => {
    expect(surplusOf("1500", 1000)).toBe(500);
    expect(surplusOf("1000", 1000)).toBe(0);
  });

  it("is nothing while the field is empty or not a number, so no question is asked yet", () => {
    expect(surplusOf("", 1000)).toBe(0);
    expect(surplusOf("abc", 1000)).toBe(0);
  });
});
