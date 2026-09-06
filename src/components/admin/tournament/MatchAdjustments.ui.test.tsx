import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchAdjustments, { effectOf } from "./MatchAdjustments";
import type { AdjustmentRuleRow, RecordedAdjustmentRow } from "./seriesTypes";

const TEYSSE: AdjustmentRuleRow = {
  id: "r1",
  name: "تيس",
  partsToSelf: 2,
  partsFromOther: 2,
};

const RECORDED: RecordedAdjustmentRow = {
  id: "a1",
  order: 2,
  side: "SIDE_A",
  rule: TEYSSE,
};

const SIDES = ["فريق القرية", "فريق الوادي"];

function show(props: Partial<Parameters<typeof MatchAdjustments>[0]> = {}) {
  const onRecord = vi.fn();
  const onUndo = vi.fn();
  const result = render(
    <MatchAdjustments
      rules={[TEYSSE]}
      recorded={[]}
      sides={SIDES}
      partWord="جولة"
      busy={false}
      open
      onRecord={onRecord}
      onUndo={onUndo}
      {...props}
    />,
  );
  return { ...result, onRecord, onUndo };
}

describe("the moves of a match", () => {
  it("keeps the game's own name rather than translating it", () => {
    show();

    expect(screen.getByText(/تيس/)).toBeDefined();
  });

  it("says what a move does, so nobody has to work out why the parts do not add up", () => {
    expect(effectOf(TEYSSE)).toContain("تيس");
    expect(effectOf(TEYSSE)).toContain("تضيف");
    expect(effectOf(TEYSSE)).toContain("تخصم");
  });

  it("says a move happened and which side did it", () => {
    show({ recorded: [RECORDED] });

    expect(screen.getByText(/تيس من فريق القرية/)).toBeDefined();
  });

  it("records the move and the side it was given", () => {
    const { onRecord } = show();

    fireEvent.change(screen.getByLabelText("تسجيل حركة"), { target: { value: "r1" } });
    fireEvent.change(screen.getByLabelText("اختر الطرف..."), { target: { value: "SIDE_B" } });
    fireEvent.click(screen.getByText("إضافة"));

    expect(onRecord).toHaveBeenCalledWith("r1", "SIDE_B");
  });

  it("will not record until both the move and the side are given", () => {
    show();

    expect(screen.getByRole("button", { name: "إضافة" }).hasAttribute("disabled")).toBe(true);
  });

  it("undoes one while the match is unfinished", () => {
    const { onUndo } = show({ recorded: [RECORDED] });

    fireEvent.click(screen.getByLabelText("تراجع تيس"));

    expect(onUndo).toHaveBeenCalledWith("a1");
  });

  it("offers no undo once the match is over", () => {
    show({ recorded: [RECORDED], open: false });

    expect(screen.queryByLabelText("تراجع تيس")).toBeNull();
    expect(screen.getByText(/تيس من فريق القرية/)).toBeDefined();
  });

  it("shows nothing at all where the tournament declared none", () => {
    const { container } = show({ rules: [], recorded: [] });

    expect(container.textContent).toBe("");
  });
});
