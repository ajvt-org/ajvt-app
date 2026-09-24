import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AMOUNT_OP_LABEL, amountFilter } from "@/lib/texts";
import type { AmountFilter } from "@/lib/amountFilter";
import AmountFilterInput from "./AmountFilterInput";

function renderInput(value: AmountFilter = { op: "gt", figure: "" }) {
  const onChange = vi.fn();
  render(<AmountFilterInput value={value} onChange={onChange} />);
  return onChange;
}

describe("AmountFilterInput", () => {
  it("offers equal to, under and over", () => {
    renderInput();

    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual([AMOUNT_OP_LABEL.eq, AMOUNT_OP_LABEL.lt, AMOUNT_OP_LABEL.gt]);
  });

  it("hands back the figure typed with the operator shown", () => {
    const onChange = renderInput();

    fireEvent.change(screen.getByLabelText(amountFilter.figure), { target: { value: "500" } });

    expect(onChange).toHaveBeenCalledWith({ op: "gt", figure: "500" });
  });

  it("hands back the operator picked with the figure kept", () => {
    const onChange = renderInput({ op: "gt", figure: "500" });

    fireEvent.change(screen.getByLabelText(amountFilter.operator), { target: { value: "lt" } });

    expect(onChange).toHaveBeenCalledWith({ op: "lt", figure: "500" });
  });

  it("shows what it was given", () => {
    renderInput({ op: "eq", figure: "1500" });

    expect((screen.getByLabelText(amountFilter.operator) as HTMLSelectElement).value).toBe("eq");
    expect((screen.getByLabelText(amountFilter.figure) as HTMLInputElement).value).toBe("1500");
  });
});
