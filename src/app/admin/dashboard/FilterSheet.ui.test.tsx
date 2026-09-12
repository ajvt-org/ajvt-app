import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import FilterSheet from "./FilterSheet";
import { NO_FILTERS } from "@/lib/memberFilters";

const AGE_GROUPS = [{ id: "g1", name: "البدريين" }];
const VILLAGES = [{ id: "v1", name: "أفجار" }];
const RECORDING_ADMINS = [
  { id: "a1", username: "boss" },
  { id: "a2", username: "amine" },
];

function renderSheet(over: Partial<typeof NO_FILTERS> = {}, recordingAdmins = RECORDING_ADMINS) {
  cleanup();
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(
    <FilterSheet
      filters={{ ...NO_FILTERS, ...over }}
      ageGroups={AGE_GROUPS}
      villages={VILLAGES}
      recordingAdmins={recordingAdmins}
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

  it("offers both origins", () => {
    renderSheet();
    const origin = screen.getByLabelText("تصفية حسب مصدر العضوية");

    expect(screen.getByRole("option", { name: "سجّلها مشرف" })).toBeDefined();
    expect(screen.getByRole("option", { name: "سجّلها العضو بنفسه" })).toBeDefined();
    expect((origin as HTMLSelectElement).value).toBe("");
  });

  it("picks the self origin and clears the two narrowings", () => {
    const { onChange } = renderSheet({ origin: "admin", nophone: "yes", nocapture: "yes" });

    fireEvent.change(screen.getByLabelText("تصفية حسب مصدر العضوية"), {
      target: { value: "self" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "self", nophone: "", nocapture: "" }),
    );
  });

  it("hides the two narrowings under the self origin", () => {
    renderSheet({ origin: "self" });

    expect(screen.queryByText("بلا رقم هاتف")).toBeNull();
    expect(screen.queryByText("بلا صورة دفع")).toBeNull();
  });

  it("keeps the two narrowings under the admin origin", () => {
    renderSheet({ origin: "admin" });

    expect(screen.getByText("بلا رقم هاتف")).toBeDefined();
    expect(screen.getByText("بلا صورة دفع")).toBeDefined();
  });

  it("offers the recording admins by name under the admin origin", () => {
    renderSheet({ origin: "admin" });

    const picker = screen.getByLabelText("تصفية حسب المشرف");
    expect(picker).toBeDefined();
    expect(screen.getByText("boss")).toBeDefined();
    expect(screen.getByText("amine")).toBeDefined();
  });

  it("offers no admin by name until the admin origin is picked", () => {
    renderSheet();

    expect(screen.queryByLabelText("تصفية حسب المشرف")).toBeNull();
  });

  it("offers nobody when no admin has recorded a membership", () => {
    renderSheet({ origin: "admin" }, []);

    expect(screen.queryByLabelText("تصفية حسب المشرف")).toBeNull();
  });

  it("narrows to the admin that was picked", () => {
    const { onChange } = renderSheet({ origin: "admin" });

    fireEvent.change(screen.getByLabelText("تصفية حسب المشرف"), { target: { value: "a1" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recorder: "a1" }));
  });

  it("lets go of the named admin when the origin changes", () => {
    const { onChange } = renderSheet({ origin: "admin", recorder: "a1" });

    fireEvent.change(screen.getByLabelText("تصفية حسب مصدر العضوية"), {
      target: { value: "self" },
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recorder: "" }));
  });
});
