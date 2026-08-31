import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import MemberSearch from "./MemberSearch";

function renderSearch(over: Partial<Parameters<typeof MemberSearch>[0]> = {}) {
  cleanup();
  const props = {
    value: "",
    filterCount: 0,
    statsOpen: false,
    onChange: vi.fn(),
    onOpenFilters: vi.fn(),
    onToggleStats: vi.fn(),
    onExport: vi.fn(),
    onManageAgeGroups: vi.fn(),
    onManageVillages: vi.fn(),
    onManualAdd: vi.fn(),
    onImport: vi.fn(),
    ...over,
  };
  render(<MemberSearch {...props} />);
  return props;
}

describe("MemberSearch", () => {
  it("opens the filter sheet from the filter button", () => {
    const props = renderSearch();

    fireEvent.click(screen.getByText("تصفية"));

    expect(props.onOpenFilters).toHaveBeenCalled();
  });

  it("counts the active filters on the filter button", () => {
    renderSearch({ filterCount: 3 });

    expect(screen.getByText("3")).toBeDefined();
  });

  it("keeps the secondary actions behind the menu until asked", () => {
    const props = renderSearch();

    expect(screen.queryByText("تصدير")).toBeNull();
    fireEvent.click(screen.getByLabelText("المزيد"));
    fireEvent.click(screen.getByText("تصدير"));

    expect(props.onExport).toHaveBeenCalled();
    expect(screen.queryByText("تصدير")).toBeNull();
  });

  it("runs the age groups and stats actions from the menu", () => {
    const props = renderSearch();

    fireEvent.click(screen.getByLabelText("المزيد"));
    fireEvent.click(screen.getByText("الأعصار"));
    fireEvent.click(screen.getByLabelText("المزيد"));
    fireEvent.click(screen.getByText("الإحصائيات"));

    expect(props.onManageAgeGroups).toHaveBeenCalled();
    expect(props.onToggleStats).toHaveBeenCalled();
  });
});
