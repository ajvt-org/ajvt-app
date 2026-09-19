import { describe, it, expect } from "vitest";
import { adminHome } from "./adminHome";
import { activityRow } from "./activities";
import { financeReport } from "./financeReport";
import { matchEventLabel } from "./matchAdmin";
import { money } from "../money";

describe("text formatters", () => {
  it("weaves the numbers into the admin home lines", () => {
    expect(adminHome.renewedQuestion(2026)).toContain("2026");
    expect(adminHome.renewedDetail(8, "10 أعضاء")).toContain("10 أعضاء");
    expect(adminHome.moneyDetail(5000, 2000)).toContain(money(5000));
    expect(adminHome.pendingDetail(1, 2, 3)).toContain("3");
  });

  it("weaves the numbers into the finance report lines", () => {
    expect(financeReport.span("2026-01-01", "2026-08-24")).toContain("2026-08-24");
    expect(financeReport.moneyDetail(5000, 2000)).toContain(money(5000));
    expect(financeReport.splitDetail(4000, 1000)).toContain(money(4000));
  });

  it("punctuates a goal row and a card row the same way", () => {
    expect(matchEventLabel(["الصقور", "سالم"], "9")).toBe("الصقور — سالم 9'");
    expect(matchEventLabel(["سالم"], 9)).toBe("سالم 9'");
  });

  it("leaves out a minute nobody recorded, and a side nobody named", () => {
    expect(matchEventLabel(["الصقور", "سالم"], null)).toBe("الصقور — سالم");
    expect(matchEventLabel([undefined, "سالم"], "")).toBe("سالم");
  });

  it("keeps the stage row's unfiltered chip apart from the word the other rows use", () => {
    expect(activityRow.filters.anyStage).not.toBe(activityRow.filters.any);
  });

  it("names the activity in the row labels", () => {
    expect(activityRow.pendingChip(2)).toContain("2");
    expect(activityRow.moveUp("الدوري")).toContain("الدوري");
    expect(activityRow.moveDown("الدوري")).toContain("الدوري");
  });
});
