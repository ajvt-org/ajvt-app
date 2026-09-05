import { describe, it, expect } from "vitest";
import { textRuns } from "./textRuns";

describe("splitting a line into the runs it reads in", () => {
  it("leaves a line of arabic whole", () => {
    expect(textRuns("رابطة شباب قرية التاكلالت")).toEqual([
      { rtl: true, text: "رابطة شباب قرية التاكلالت" },
    ]);
  });

  it("leaves a line of latin whole", () => {
    expect(textRuns("R-2026-0001")).toEqual([{ rtl: false, text: "R-2026-0001" }]);
  });

  it("keeps a date together rather than cutting it at every separator", () => {
    expect(textRuns("24 / 08 / 2026")).toEqual([{ rtl: false, text: "24 / 08 / 2026" }]);
  });

  it("keeps a thousands separator inside the number it belongs to", () => {
    expect(textRuns("5 000")).toEqual([{ rtl: false, text: "5 000" }]);
  });

  it("cuts an arabic line at the number inside it", () => {
    expect(textRuns("المبلغ 5000 أوقية")).toEqual([
      { rtl: true, text: "المبلغ " },
      { rtl: false, text: "5000" },
      { rtl: true, text: " أوقية" },
    ]);
  });

  it("keeps the punctuation that trails an arabic run with that run", () => {
    expect(textRuns("التاريخ : 2026")).toEqual([
      { rtl: true, text: "التاريخ : " },
      { rtl: false, text: "2026" },
    ]);
  });

  it("answers nothing for an empty line", () => {
    expect(textRuns("")).toEqual([]);
  });
});
