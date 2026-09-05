import { describe, it, expect } from "vitest";
import { isFootball } from "./matchShape";

describe("what a match in the tournament is made of", () => {
  it("counts only football as football", () => {
    expect(isFootball("FOOTBALL")).toBe(true);
    expect(isFootball("SERIES")).toBe(false);
  });
});
