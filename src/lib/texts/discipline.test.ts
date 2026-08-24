import { describe, it, expect } from "vitest";
import { discipline } from "./discipline";

describe("discipline texts", () => {
  it("weaves the details into the lines", () => {
    expect(discipline.proposedBy("عثمان")).toContain("عثمان");
    expect(discipline.remaining("3 مباريات")).toContain("3 مباريات");
    expect(discipline.until("15 سبتمبر")).toContain("15 سبتمبر");
  });
});
