import { describe, it, expect } from "vitest";
import {
  countedLabel,
  countedNoun,
  hoursLabel,
  QUESTIONS,
  POINTS,
  SECONDS,
} from "@/lib/arabicPlural";

describe("countedNoun", () => {
  it("names one and two rather than counting them", () => {
    expect(countedNoun(1, QUESTIONS)).toBe("سؤال واحد");
    expect(countedNoun(2, QUESTIONS)).toBe("سؤالين");
  });

  it("uses the plural from three to ten", () => {
    expect(countedNoun(3, QUESTIONS)).toBe("3 أسئلة");
    expect(countedNoun(10, POINTS)).toBe("10 نقاط");
    expect(countedNoun(10, SECONDS)).toBe("10 ثوانٍ");
  });

  it("returns to the accusative singular from eleven to ninety nine", () => {
    expect(countedNoun(11, QUESTIONS)).toBe("11 سؤالاً");
    expect(countedNoun(46, POINTS)).toBe("46 نقطة");
    expect(countedNoun(99, QUESTIONS)).toBe("99 سؤالاً");
  });

  it("gives zero and the round hundreds the bare singular", () => {
    expect(countedNoun(0, QUESTIONS)).toBe("0 سؤال");
    expect(countedNoun(100, QUESTIONS)).toBe("100 سؤال");
    expect(countedNoun(200, POINTS)).toBe("200 نقطة");
  });

  it("reads the shape off the last two digits", () => {
    expect(countedNoun(103, QUESTIONS)).toBe("103 أسئلة");
    expect(countedNoun(146, QUESTIONS)).toBe("146 سؤالاً");
  });
});

describe("hoursLabel", () => {
  it("names one hour rather than counting it", () => {
    expect(hoursLabel(1)).toBe("ساعة واحدة");
  });

  it("uses the dual for two, which Arabic has and English does not", () => {
    expect(hoursLabel(2)).toBe("ساعتين");
  });

  it("uses the plural noun from three to ten", () => {
    expect(hoursLabel(3)).toBe("3 ساعات");
    expect(hoursLabel(10)).toBe("10 ساعات");
  });

  it("returns to the singular noun from eleven up", () => {
    expect(hoursLabel(11)).toBe("11 ساعة");
    expect(hoursLabel(24)).toBe("24 ساعة");
    expect(hoursLabel(720)).toBe("720 ساعة");
  });

  it("never leaves a bare number, whatever the count", () => {
    for (let n = 1; n <= 720; n++) expect(hoursLabel(n)).toMatch(/ساع/);
  });
});

describe("countedLabel", () => {
  const pick = (n: number) => countedLabel(n, "مركزك", "مركزاك", "مراكزك");

  it("uses the singular for one", () => {
    expect(pick(1)).toBe("مركزك");
  });

  it("uses the dual for two, which is a form of its own", () => {
    expect(pick(2)).toBe("مركزاك");
  });

  it("uses the plural from three up", () => {
    expect(pick(3)).toBe("مراكزك");
    expect(pick(9)).toBe("مراكزك");
  });
});
