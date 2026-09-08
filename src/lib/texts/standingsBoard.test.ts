import { describe, it, expect } from "vitest";
import { standingsBoard } from "./standingsBoard";

describe("standings board texts", () => {
  it("weaves the rank and the total into a member's own place", () => {
    expect(standingsBoard.myPlace(14, 20)).toBe("ترتيبك 14 بمجموع 20 نقطة");
  });

  it("counts the points of a place", () => {
    expect(standingsBoard.myPlace(1, 1)).toContain("نقطة واحدة");
    expect(standingsBoard.myPlace(2, 2)).toContain("نقطتين");
    expect(standingsBoard.myPlace(3, 5)).toContain("5 نقاط");
  });
});
