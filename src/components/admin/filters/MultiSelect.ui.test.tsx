import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { multiSelect } from "@/lib/texts";
import MultiSelect from "./MultiSelect";

const OPTIONS = [
  { value: "a", label: "ألف" },
  { value: "b", label: "باء" },
  { value: "c", label: "جيم" },
];

function renderSelect(chosen: string[] = [], onChange = vi.fn()) {
  render(
    <MultiSelect
      label="اختر"
      allLabel="الكل"
      options={OPTIONS}
      chosen={chosen}
      onChange={onChange}
    />,
  );
  return { onChange, trigger: screen.getByRole("button", { name: "اختر" }) };
}

describe("MultiSelect", () => {
  it("reads as all when nothing is chosen", () => {
    const { trigger } = renderSelect();

    expect(trigger.textContent).toContain("الكل");
  });

  it("names the one value chosen", () => {
    const { trigger } = renderSelect(["b"]);

    expect(trigger.textContent).toContain("باء");
  });

  it("names the first value and counts the rest", () => {
    const { trigger } = renderSelect(["b", "c"]);

    expect(trigger.textContent).toContain("باء");
    expect(trigger.textContent).toContain("+1");
  });

  it("keeps the list closed until it is opened", () => {
    renderSelect();

    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("ticks the values already chosen", () => {
    const { trigger } = renderSelect(["a"]);

    fireEvent.click(trigger);

    expect((screen.getByRole("checkbox", { name: "ألف" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "باء" }) as HTMLInputElement).checked).toBe(false);
  });

  it("adds a value to the ones chosen", () => {
    const { trigger, onChange } = renderSelect(["a"]);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "جيم" }));

    expect(onChange).toHaveBeenCalledWith(["a", "c"]);
  });

  it("takes a value back out", () => {
    const { trigger, onChange } = renderSelect(["a", "c"]);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "ألف" }));

    expect(onChange).toHaveBeenCalledWith(["c"]);
  });

  it("hands back an empty list when the last value is taken out", () => {
    const { trigger, onChange } = renderSelect(["a"]);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "ألف" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("closes when tapped outside", () => {
    const { trigger } = renderSelect();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: multiSelect.closeList }));

    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows a chosen value the options no longer hold by its raw value", () => {
    const { trigger } = renderSelect(["gone"]);

    expect(trigger.textContent).toContain("gone");
  });
});
