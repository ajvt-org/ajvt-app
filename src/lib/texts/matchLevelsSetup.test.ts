import { describe, it, expect } from "vitest";
import { matchLevelsSetup } from "./matchLevelsSetup";

describe("match levels setup texts", () => {
  it("numbers a level", () => {
    expect(matchLevelsSetup.levelNumber(2)).toBe("المستوى 2");
  });

  it("names the level a control acts on", () => {
    for (const line of [
      matchLevelsSetup.removeLevel(2),
      matchLevelsSetup.moveUp(2),
      matchLevelsSetup.moveDown(2),
    ]) {
      expect(line).toContain("2");
    }
  });

  it("states a move as what it adds and what it takes", () => {
    expect(matchLevelsSetup.moveLine("تيس", "2", "2")).toBe("تيس تضيف 2 وتخصم 2");
  });

  it("names the move a control acts on", () => {
    expect(matchLevelsSetup.removeMove("تيس")).toContain("تيس");
  });
});
