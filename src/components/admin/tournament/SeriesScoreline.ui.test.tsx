import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SeriesScoreline, { partMark } from "./SeriesScoreline";
import type { PartRow, SeriesStandingRow } from "./seriesTypes";

function part(id: string, order: number, extra: Partial<PartRow> = {}): PartRow {
  return {
    id,
    order,
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    ...extra,
  };
}

function standing(extra: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideAHalves: 0,
    sideBHalves: 0,
    partsRecorded: 0,
    partsScored: 0,
    partsLeft: 2,
    partsAllowed: 2,
    target: null,
    over: false,
    level: true,
    extending: false,
    winner: null,
    ...extra,
  };
}

describe("partMark", () => {
  it("marks a part won, drawn and lost the way a chess table does", () => {
    expect(partMark(part("p", 1, { outcome: "SIDE_A" })).text).toBe("1");
    expect(partMark(part("p", 1, { outcome: "DRAW" })).text).toBe("½");
    expect(partMark(part("p", 1, { outcome: "SIDE_B" })).text).toBe("0");
  });

  it("marks a part played to a score with both scores", () => {
    expect(partMark(part("p", 1, { sideAPoints: 101, sideBPoints: 74 })).text).toBe("101-74");
  });

  it("marks an abandoned part as scoring nothing", () => {
    const mark = partMark(part("p", 1, { abandoned: true }));
    expect(mark.text).toBe("—");
    expect(mark.dim).toBe(true);
  });
});

describe("the scoreline on a match card", () => {
  it("shows the total and every part", () => {
    render(
      <SeriesScoreline
        parts={[part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "DRAW" })]}
        standing={standing({ sideAHalves: 3, sideBHalves: 1, over: true, level: false })}
        partWord="لعبة"
      />,
    );

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getAllByText("½").length).toBeGreaterThan(0);
  });

  it("reads a match in progress differently from a finished one", () => {
    const { rerender, container } = render(
      <SeriesScoreline parts={[]} standing={standing()} partWord="لعبة" />,
    );
    expect(screen.getByText("قيد اللعب")).toBeDefined();

    rerender(
      <SeriesScoreline
        parts={[]}
        standing={standing({ over: true, level: false, winner: "SIDE_A" })}
        partWord="لعبة"
      />,
    );
    expect(screen.queryByText("قيد اللعب")).toBeNull();
    expect(container.textContent).not.toContain("تعادلت");
  });

  it("says a level knockout match is being extended rather than looking finished", () => {
    render(
      <SeriesScoreline
        parts={[]}
        standing={standing({ extending: true, partsAllowed: 4 })}
        partWord="لعبة"
      />,
    );

    expect(screen.getByText("تعادلت، وتُمدَّد بجولتين")).toBeDefined();
  });

  it("says a finished match ended level", () => {
    render(
      <SeriesScoreline
        parts={[]}
        standing={standing({ over: true, level: true, partsLeft: 0 })}
        partWord="لعبة"
      />,
    );

    expect(screen.getByText("تعادل")).toBeDefined();
  });

  it("shows a side that owes parts with the sign in front of the number", () => {
    const { container } = render(
      <SeriesScoreline
        parts={[]}
        standing={standing({ sideAHalves: -4, sideBHalves: 4 })}
        partWord="لعبة"
      />,
    );

    expect(container.textContent).toContain("−2");
  });
});
