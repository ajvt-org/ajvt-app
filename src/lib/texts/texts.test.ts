import { describe, it, expect } from "vitest";
import { adminHome } from "./adminHome";
import { activityRow } from "./activities";

describe("text formatters", () => {
  it("weaves the numbers into the admin home lines", () => {
    expect(adminHome.renewedQuestion(2026)).toContain("2026");
    expect(adminHome.renewedDetail(8, "10 أعضاء")).toContain("10 أعضاء");
    expect(adminHome.ouguiya(3000)).toBe("3000 أوقية");
    expect(adminHome.moneyDetail(5000, 2000)).toContain("5000");
    expect(adminHome.pendingDetail(1, 2, 3)).toContain("3");
  });

  it("names the activity in the row labels", () => {
    expect(activityRow.pendingChip(2)).toContain("2");
    expect(activityRow.open("النشاط")).toContain("النشاط");
    expect(activityRow.moveUp("الدوري")).toContain("الدوري");
    expect(activityRow.moveDown("الدوري")).toContain("الدوري");
  });
});
