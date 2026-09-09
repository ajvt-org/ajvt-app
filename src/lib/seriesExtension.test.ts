import { describe, it, expect } from "vitest";
import { extensionLine } from "./seriesExtension";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "match",
  order: 0,
  singular: "المباراة",
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  target: null,
  unsettled: null,
  margin: null,
  continueUnits: null,
  deciderTarget: null,
  startingCredit: 0,
  creditWindow: 0,
};

describe("what a match being extended says", () => {
  it("takes the dual at two rather than printing a number and a plural", () => {
    const match = { ...BLANK, unsettled: "CONTINUE" as const, margin: 1, continueUnits: 2 };

    expect(extensionLine(match)).toBe("تعادلت، وتُمدَّد بوحدتان");
  });

  it("counts the units where there are more than two", () => {
    const match = { ...BLANK, unsettled: "CONTINUE" as const, margin: 1, continueUnits: 3 };

    expect(extensionLine(match)).toBe("تعادلت، وتُمدَّد ب3 وحدات");
  });

  it("says a deciding unit is played where that is what happens", () => {
    const match = { ...BLANK, unsettled: "DECIDER" as const };

    expect(extensionLine(match)).toBe("تعادلت، وتُلعب وحدة حاسمة");
  });

  it("says nothing rather than an extension by no units", () => {
    expect(extensionLine(BLANK)).toBeNull();
    expect(extensionLine({ ...BLANK, unsettled: "CONTINUE", margin: 1 })).toBeNull();
  });
});
