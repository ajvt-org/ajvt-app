import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormSelect, { SEARCH_FROM } from "./FormSelect";

const SEARCH = { placeholder: "ابحث", label: "بحث", empty: "لا نتيجة" };

function many(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `عصر ${i}`);
}

function setup(options: string[], value = "", search: typeof SEARCH | null = SEARCH) {
  const onChange = vi.fn();
  render(
    <FormSelect
      id="age"
      label="العصر"
      placeholder="اختر"
      value={value}
      options={options}
      onChange={onChange}
      search={search ?? undefined}
    />,
  );
  return { onChange };
}

function shown(): string[] {
  return Array.from(document.querySelectorAll("option"))
    .map((o) => o.textContent ?? "")
    .filter((t) => t !== "اختر");
}

describe("FormSelect search", () => {
  it("stays out of the way for a short list", () => {
    setup(many(SEARCH_FROM - 1));

    expect(screen.queryByLabelText("بحث")).toBeNull();
  });

  it("appears once the list is long enough to scroll", () => {
    setup(many(SEARCH_FROM));

    expect(screen.getByLabelText("بحث")).toBeDefined();
  });

  it("is never offered when the caller does not ask for it", () => {
    setup(many(SEARCH_FROM + 5), "", null);

    expect(screen.queryByLabelText("بحث")).toBeNull();
  });

  it("narrows the options to what was typed", async () => {
    setup([...many(SEARCH_FROM), "البدريين"]);

    await userEvent.type(screen.getByLabelText("بحث"), "البدريين");

    expect(shown()).toEqual(["البدريين"]);
  });

  it("keeps every option when the box is empty", () => {
    setup(many(SEARCH_FROM));

    expect(shown()).toHaveLength(SEARCH_FROM);
  });

  it("keeps the chosen option visible even when it does not match", async () => {
    setup([...many(SEARCH_FROM), "البدريين"], "عصر 0");

    await userEvent.type(screen.getByLabelText("بحث"), "البدريين");

    expect(shown()).toContain("عصر 0");
  });

  it("says so when nothing matches", async () => {
    setup(many(SEARCH_FROM));

    await userEvent.type(screen.getByLabelText("بحث"), "لا شيء");

    expect(screen.getByText("لا نتيجة")).toBeDefined();
  });
});
