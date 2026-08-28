import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import FilterSheet from "./FilterSheet";
import { NO_FILTERS } from "@/lib/memberFilters";

const AGE_GROUPS = [{ id: "g1", name: "البدريين" }];
const VILLAGES = [{ id: "v1", name: "أفجار" }];

function renderSheet(over: Partial<typeof NO_FILTERS> = {}) {
  cleanup();
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(
    <FilterSheet
      filters={{ ...NO_FILTERS, ...over }}
      ageGroups={AGE_GROUPS}
      villages={VILLAGES}
      paymentMethods={["بنكيلي"]}
      years={[2025, 2026]}
      year={2026}
      resultCount={12}
      onChange={onChange}
      onClose={onClose}
    />,
  );
  return { onChange, onClose };
}

describe("FilterSheet", () => {
  it("applies a picked filter immediately", () => {
    const { onChange } = renderSheet();

    fireEvent.change(screen.getByLabelText("تصفية حسب العصر"), {
      target: { value: "البدريين" },
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ age: "البدريين" }));
  });

  it("offers the year filter only when more than one year exists", () => {
    renderSheet();

    expect(screen.getByLabelText("تصفية حسب سنة العضوية")).toBeDefined();
  });

  it("toggles the standing chips", () => {
    const { onChange } = renderSheet({ standing: "current" });

    fireEvent.click(screen.getByText("حالي 2026"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ standing: "" }));
  });

  it("clears the filters but keeps the tab and the search", () => {
    const { onChange } = renderSheet({ status: "ACTIVE", q: "محمد", age: "البدريين" });

    fireEvent.click(screen.getByText("إزالة التصفية"));

    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, status: "ACTIVE", q: "محمد" });
  });

  it("closes on done", () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByText("تم"));

    expect(onClose).toHaveBeenCalled();
  });
});
