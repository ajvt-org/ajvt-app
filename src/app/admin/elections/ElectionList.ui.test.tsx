import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionList from "./ElectionList";
import type { ElectionRow } from "./electionTypes";

const HOUR = 3600_000;

function row(over: Partial<ElectionRow>): ElectionRow {
  return {
    id: "e1",
    title: "انتخاب اللجنة",
    hidden: true,
    startsAt: new Date(Date.now() + 24 * HOUR).toISOString(),
    durationMinutes: 120,
    allowBlank: false,
    shuffleCandidates: false,
    showResults: true,
    candidates: [],
    _count: { ballots: 0 },
    ...over,
  };
}

function show(rows: ElectionRow[]) {
  render(<ElectionList rows={rows} selectedId={null} onSelect={vi.fn()} onCreate={vi.fn()} />);
}

describe("the election list", () => {
  it("says so when there is nothing to show yet", () => {
    show([]);

    expect(screen.getByText("لا توجد انتخابات بعد")).toBeTruthy();
  });

  it("marks a hidden election as hidden whatever the clock says", () => {
    show([row({ hidden: true, startsAt: new Date(Date.now() - HOUR).toISOString() })]);

    expect(screen.getByText("مخفي")).toBeTruthy();
  });

  it("reads the state off the clock once the election is published", () => {
    show([
      row({ id: "a", title: "قادم", hidden: false }),
      row({
        id: "b",
        title: "جار",
        hidden: false,
        startsAt: new Date(Date.now() - HOUR).toISOString(),
      }),
      row({
        id: "c",
        title: "منته",
        hidden: false,
        startsAt: new Date(Date.now() - 10 * HOUR).toISOString(),
        durationMinutes: 60,
      }),
    ]);

    expect(screen.getByText("لم يبدأ بعد")).toBeTruthy();
    expect(screen.getByText("التصويت جار")).toBeTruthy();
    expect(screen.getByText("انتهى")).toBeTruthy();
  });

  it("carries both ends of the window on every row", () => {
    show([row({ hidden: false })]);

    expect(screen.getByText("من")).toBeTruthy();
    expect(screen.getByText("إلى")).toBeTruthy();
  });

  it("lets a long title wrap rather than cutting it", () => {
    const title = "انتخاب رئيس لجنة الشباب والرياضة بالتاكلالت";
    show([row({ title })]);

    expect(screen.getByText(title).className).not.toContain("truncate");
  });
});
