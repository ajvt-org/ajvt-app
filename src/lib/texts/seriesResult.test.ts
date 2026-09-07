import { describe, it, expect } from "vitest";
import { seriesResult } from "./seriesResult";

describe("series result texts", () => {
  it("names a unit by the word the level carries and its number", () => {
    expect(seriesResult.unitNumber("شوط", 3)).toBe("شوط 3");
  });

  it("heads the list with the plural the level carries", () => {
    expect(seriesResult.heading("أشواط")).toContain("أشواط");
    expect(seriesResult.none("أشواط")).toContain("أشواط");
  });

  it("says what is left and what ends the match in the tournament's own words", () => {
    expect(seriesResult.unitsLeft("شوطان")).toContain("شوطان");
    expect(seriesResult.endsAt("3 أشواط")).toContain("3 أشواط");
    expect(seriesResult.endsWhenAllPlayed("الأشواط")).toContain("الأشواط");
  });

  it("takes the count and the unit into the extension line", () => {
    expect(seriesResult.extending("جولتان")).toContain("جولتان");
  });

  it("weaves a side name into the lines about one side", () => {
    for (const line of [
      seriesResult.wonBy("أحمد"),
      seriesResult.wonThe("أحمد"),
      seriesResult.pointsOf("أحمد"),
    ]) {
      expect(line).toContain("أحمد");
    }
  });

  it("says which colour a side opened in", () => {
    expect(seriesResult.colourOf("أحمد", "أبيض")).toBe("أحمد أبيض");
  });

  it("says what a move is and what it does", () => {
    expect(seriesResult.moveOf("تيس", "أحمد")).toBe("تيس من أحمد");
    expect(seriesResult.moveEffect("تيس", "جولتان", "جولتان")).toContain("تيس");
  });
});
