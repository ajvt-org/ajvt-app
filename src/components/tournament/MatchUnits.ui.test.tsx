import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchUnits, { scoreOf } from "./MatchUnits";
import type { LevelRow } from "@/lib/matchLevels";
import type { SeriesStandingRow, UnitRow } from "@/components/admin/tournament/seriesTypes";

const BLANK: LevelRow = {
  id: "level",
  order: 0,
  singular: "المباراة",
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

const LADDER: LevelRow[] = [
  { ...BLANK, id: "match", order: 0, countedBy: "OUTCOME", endsBy: "COUNT", unitCount: 2 },
  {
    ...BLANK,
    id: "set",
    order: 1,
    singular: "شوط",
    countedBy: "POINTS",
    endsBy: "TARGET",
    target: 100,
  },
  { ...BLANK, id: "point", order: 2, singular: "نقطة" },
];

function standing(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideATotal: 0,
    sideBTotal: 0,
    sideALostCredit: false,
    sideBLostCredit: false,
    scored: false,
    perUnit: 2,
    unitsRecorded: 0,
    unitsScored: 0,
    unitsLeft: 0,
    unitsAllowed: 0,
    target: null,
    over: true,
    level: false,
    unsettled: false,
    extending: false,
    winner: null,
    ...over,
  };
}

function unit(id: string, order: number, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    levelId: "set",
    order,
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    worth: null,
    sideALostCredit: false,
    sideBLostCredit: false,
    decider: false,
    endedBy: null,
    children: [],
    standing: null,
    ...extra,
  };
}

const SIDES = ["أحمد", "محمد"];

const show = (units: UnitRow[], levels: LevelRow[] = LADDER) =>
  render(<MatchUnits units={units} levels={levels} sides={SIDES} />);

describe("the units on a public match card", () => {
  it("opens on the level under the match", () => {
    show([unit("s1", 1, { sideAPoints: 12, sideBPoints: 9 })]);

    expect(screen.getByText("شوط 1")).toBeDefined();
    expect(screen.getByText("12 — 9")).toBeDefined();
  });

  it("shows a unit with nothing under it and stops there", () => {
    show([unit("s1", 1, { sideAPoints: 12, sideBPoints: 9 })]);

    expect(screen.queryByLabelText("فتح شوط 1")).toBeNull();
  });

  it("opens a unit that has something under it", () => {
    const deep = [
      unit("s1", 1, {
        children: [unit("p1", 1, { levelId: "point", sideAPoints: 101, sideBPoints: 20 })],
        standing: standing({ sideATotal: 1, winner: "SIDE_A" }),
      }),
    ];
    show(deep);
    fireEvent.click(screen.getByLabelText("فتح شوط 1"));

    expect(screen.getByText("نقطة 1")).toBeDefined();
    expect(screen.getByText("101 — 20")).toBeDefined();
  });

  it("names a level the tournament declared and no other", () => {
    show([unit("s1", 1, { sideAPoints: 12, sideBPoints: 9 })], LADDER.slice(0, 2));

    expect(screen.getByText("شوط 1")).toBeDefined();
    expect(screen.queryByText("نقطة 1")).toBeNull();
  });

  it("says a unit was ended by a rule in the tournament's own wording", () => {
    const ended = unit("s1", 1, {
      endedBy: {
        id: "r",
        name: "تيس",
        unitsToSelf: 2,
        unitsFromOther: 2,
        levelId: "set",
        endsUnit: true,
        unitWorth: null,
      },
    });
    show([ended]);

    expect(screen.getByText("أنهتها تيس")).toBeDefined();
  });

  it("says what a doubled unit counted", () => {
    show([unit("s1", 1, { sideAPoints: 101, sideBPoints: 0, worth: 2 })]);

    expect(screen.getByText("تُحتسب 2")).toBeDefined();
  });

  it("marks the deciding unit", () => {
    show([unit("s1", 1, { sideAPoints: 12, sideBPoints: 9, decider: true })]);

    expect(screen.getByText("الوحدة الحاسمة")).toBeDefined();
  });

  it("draws nothing where the tournament declares only the match", () => {
    const { container } = show([unit("s1", 1)], LADDER.slice(0, 1));

    expect(container.textContent).toBe("");
  });
});

describe("what a unit reads as", () => {
  it("takes a computed score from its children rather than from the row", () => {
    const parent = unit("s1", 1, {
      sideAPoints: 99,
      sideBPoints: 0,
      children: [unit("p1", 1)],
      standing: standing({ sideATotal: 2, sideBTotal: 1 }),
    });

    expect(scoreOf(parent, SIDES)).toBe("2 — 1");
  });

  it("names the winner where the level was decided by an outcome", () => {
    expect(scoreOf(unit("s1", 1, { outcome: "SIDE_B" }), SIDES)).toBe("فوز محمد");
    expect(scoreOf(unit("s1", 1, { outcome: "DRAW" }), SIDES)).toBe("تعادل");
  });
});
