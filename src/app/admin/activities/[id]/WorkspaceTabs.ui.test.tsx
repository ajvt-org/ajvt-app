import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import WorkspaceTabs, { type WorkspaceTab } from "./WorkspaceTabs";

const TABS: WorkspaceTab[] = [
  { key: "details", label: "التفاصيل", icon: "pencil" },
  { key: "registrations", label: "المسجلون", icon: "users", badge: 3 },
  { key: "log", label: "السجل", icon: "list", badge: 0 },
];

function show(active = "details", onPick = vi.fn()) {
  cleanup();
  render(<WorkspaceTabs tabs={TABS} active={active} onPick={onPick} />);
  return onPick;
}

describe("WorkspaceTabs", () => {
  it("shows every tab by name", () => {
    show();

    expect(screen.getByText("التفاصيل")).toBeDefined();
    expect(screen.getByText("المسجلون")).toBeDefined();
    expect(screen.getByText("السجل")).toBeDefined();
  });

  it("counts what waits on the admin, and stays quiet at zero", () => {
    show();

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("hands the picked tab back", () => {
    const onPick = show();

    fireEvent.click(screen.getByText("المسجلون"));

    expect(onPick).toHaveBeenCalledWith("registrations");
  });
});
