import { describe, it, expect } from "vitest";
import { extensionLine } from "./seriesExtension";
import type { LevelRow } from "./matchLevels";

const BLANK: LevelRow = {
  id: "match",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
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

const UNIT: LevelRow = { ...BLANK, id: "game", order: 1, singular: "لعبة", plural: "ألعاب" };

describe("what a match being extended says", () => {
  it("names the units a level that continues is extended by", () => {
    const match = { ...BLANK, unsettled: "CONTINUE" as const, margin: 1, continueUnits: 2 };

    expect(extensionLine(match, UNIT)).toBe("تعادلت، وتُمدَّد ب2 ألعاب");
  });

  it("says a deciding unit is played where that is what happens", () => {
    const match = { ...BLANK, unsettled: "DECIDER" as const };

    expect(extensionLine(match, UNIT)).toBe("تعادلت، وتُلعب وحدة حاسمة");
  });

  it("says nothing rather than an extension by no units", () => {
    expect(extensionLine(BLANK, UNIT)).toBeNull();
    expect(extensionLine({ ...BLANK, unsettled: "CONTINUE", margin: 1 }, UNIT)).toBeNull();
  });
});
