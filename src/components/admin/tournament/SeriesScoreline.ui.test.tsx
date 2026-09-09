import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SeriesScoreline, { unitMark } from "./SeriesScoreline";
import type { SeriesStandingRow, UnitRow } from "./seriesTypes";

function part(id: string, order: number, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    levelId: "unit",
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

function standing(extra: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideATotal: 0,
    sideBTotal: 0,
    sideALostCredit: false,
    sideBLostCredit: false,
    scored: false,
    perUnit: 2,
    unitsRecorded: 0,
    unitsScored: 0,
    unitsLeft: 2,
    unitsAllowed: 2,
    target: null,
    over: false,
    level: true,
    unsettled: false,
    extending: false,
    winner: null,
    ...extra,
  };
}

describe("the mark a unit draws", () => {
  it("marks a unit won, drawn and lost the way a chess table does", () => {
    expect(unitMark(part("p", 1, { outcome: "SIDE_A" })).text).toBe("1");
    expect(unitMark(part("p", 1, { outcome: "DRAW" })).text).toBe("½");
    expect(unitMark(part("p", 1, { outcome: "SIDE_B" })).text).toBe("0");
  });

  it("marks a unit played to a score with both scores", () => {
    expect(unitMark(part("p", 1, { sideAPoints: 101, sideBPoints: 74 })).text).toBe("101-74");
  });

  it("marks an abandoned part as scoring nothing", () => {
    const mark = unitMark(part("p", 1, { abandoned: true }));
    expect(mark.text).toBe("—");
    expect(mark.dim).toBe(true);
  });
});

describe("the scoreline on a match card", () => {
  it("shows the total and every part", () => {
    render(
      <SeriesScoreline
        units={[part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "DRAW" })]}
        standing={standing({ sideATotal: 3, sideBTotal: 1, over: true, level: false })}
        unitWord="لعبة"
      />,
    );

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getAllByText("½").length).toBeGreaterThan(0);
  });

  it("reads a match in progress differently from a finished one", () => {
    const { rerender, container } = render(
      <SeriesScoreline units={[]} standing={standing()} unitWord="لعبة" />,
    );
    expect(screen.getByText("قيد اللعب")).toBeDefined();

    rerender(
      <SeriesScoreline
        units={[]}
        standing={standing({ over: true, level: false, winner: "SIDE_A" })}
        unitWord="لعبة"
      />,
    );
    expect(screen.queryByText("قيد اللعب")).toBeNull();
    expect(container.textContent).not.toContain("تعادلت");
  });

  it("falls back to the running line where the extension says nothing", () => {
    render(
      <SeriesScoreline
        units={[]}
        standing={standing({ extending: true, unitsAllowed: 4 })}
        unitWord="لعبة"
      />,
    );

    expect(screen.getByText("قيد اللعب")).toBeDefined();
  });

  it("says a level knockout match is being extended rather than looking finished", () => {
    render(
      <SeriesScoreline
        units={[]}
        standing={standing({ extending: true, unitsAllowed: 4 })}
        unitWord="لعبة"
        extension="تعادلت، وتُمدَّد ب2 ألعاب"
      />,
    );

    expect(screen.getByText("تعادلت، وتُمدَّد ب2 ألعاب")).toBeDefined();
  });

  it("says a finished match ended level", () => {
    render(
      <SeriesScoreline
        units={[]}
        standing={standing({ over: true, level: true, unitsLeft: 0 })}
        unitWord="لعبة"
      />,
    );

    expect(screen.getByText("تعادل")).toBeDefined();
  });

  it("shows a side that owes units with the sign in front of the number", () => {
    const { container } = render(
      <SeriesScoreline
        units={[]}
        standing={standing({ sideATotal: -4, sideBTotal: 4 })}
        unitWord="لعبة"
      />,
    );

    expect(container.textContent).toContain("−2");
  });
});
