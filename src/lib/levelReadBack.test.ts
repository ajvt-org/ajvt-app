import { describe, it, expect } from "vitest";
import { readBackOf, type ReadBackLevel } from "./levelReadBack";

const BLANK: ReadBackLevel = {
  countedBy: null,
  endsBy: null,
  unitCount: null,
  target: null,
  unsettled: null,
  margin: null,
  continueUnits: null,
  deciderTarget: null,
  startingCredit: 0,
  creditWindow: 0,
};

const under = { singular: "دوزينة", plural: "دوزينات" };

describe("what a level reads back as", () => {
  it("says the level under it is recorded when nothing sits below", () => {
    expect(readBackOf(BLANK, null)).toBe("هذا المستوى تُسجَّل وحداته، ولا شيء تحته يحكمه");
  });

  it("asks for the rest while the questions are unanswered", () => {
    expect(readBackOf({ ...BLANK, countedBy: "OUTCOME" }, under)).toBe(
      "أكمل قواعد هذا المستوى ليقرأ بها",
    );
  });

  it("reads a count of units and how they are counted", () => {
    const level: ReadBackLevel = {
      ...BLANK,
      countedBy: "OUTCOME",
      endsBy: "COUNT",
      unitCount: 2,
      unsettled: "DECIDER",
    };

    expect(readBackOf(level, under)).toBe(
      "تُلعب 2 دوزينات تُحسب بنتيجتها، وإن لم يُحسم لُعبت دوزينة حاسمة",
    );
  });

  it("names one unit in the singular", () => {
    const level: ReadBackLevel = { ...BLANK, countedBy: "POINTS", endsBy: "COUNT", unitCount: 1 };

    expect(readBackOf(level, under)).toBe("تُلعب دوزينة تُحسب بنقاطها");
  });

  it("reads a number to reach and the number of the deciding unit", () => {
    const level: ReadBackLevel = {
      ...BLANK,
      countedBy: "OUTCOME",
      endsBy: "TARGET",
      target: 12,
      deciderTarget: 24,
    };

    expect(readBackOf(level, under)).toBe(
      "تُلعب دوزينات تُحسب بنتيجتها حتى يبلغ أحدهما 12، ورقم الحاسمة 24",
    );
  });

  it("reads what is continued and by how much", () => {
    const level: ReadBackLevel = {
      ...BLANK,
      countedBy: "POINTS",
      endsBy: "TARGET",
      target: 100,
      unsettled: "CONTINUE",
      margin: 1,
      continueUnits: 1,
    };

    expect(readBackOf(level, under)).toBe(
      "تُلعب دوزينات تُحسب بنقاطها حتى يبلغ أحدهما 100، وإن لم يُحسم استُكملت دوزينة حتى يتقدم أحدهما بفارق 1",
    );
  });

  it("reads the credit and the window it is earned in", () => {
    const level: ReadBackLevel = {
      ...BLANK,
      countedBy: "POINTS",
      endsBy: "TARGET",
      target: 100,
      startingCredit: 26,
      creditWindow: 2,
    };

    expect(readBackOf(level, under)).toBe(
      "تُلعب دوزينات تُحسب بنقاطها حتى يبلغ أحدهما 100، والرصيد الابتدائي 26 في أول 2 دوزينات",
    );
  });

  it("reads a level that ends level", () => {
    const level: ReadBackLevel = {
      ...BLANK,
      countedBy: "OUTCOME",
      endsBy: "COUNT",
      unitCount: 2,
      unsettled: "DRAW",
    };

    expect(readBackOf(level, under)).toBe(
      "تُلعب 2 دوزينات تُحسب بنتيجتها، وإن تعادلا انتهى متعادلاً",
    );
  });
});
