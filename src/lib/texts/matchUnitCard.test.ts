import { describe, it, expect } from "vitest";
import { matchUnitCard } from "./matchUnitCard";

describe("match unit card texts", () => {
  it("names a unit by the word the level carries and its number", () => {
    expect(matchUnitCard.unitNumber("شوط", 2)).toBe("شوط 2");
  });

  it("names the unit the reader is opening or closing", () => {
    expect(matchUnitCard.open("شوط 2")).toContain("شوط 2");
    expect(matchUnitCard.close("شوط 2")).toContain("شوط 2");
  });

  it("says who took a unit, what ended it and what it counted", () => {
    expect(matchUnitCard.wonBy("أحمد")).toBe("فوز أحمد");
    expect(matchUnitCard.endedByRule("تيس")).toContain("تيس");
    expect(matchUnitCard.counted("2")).toContain("2");
  });
});
