import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { adminShell, adminTabs } from "@/lib/texts";
import TopBar from "./TopBar";
import { tabsFor } from "./navTabs";

const PENDING = { members: 0, activityWork: 0, donations: 0 };

function showBar(onLogout = vi.fn()) {
  render(
    <TopBar
      tabs={tabsFor("SUPER")}
      pathname="/admin/payments"
      pending={PENDING}
      onOpen={vi.fn()}
      onLogout={onLogout}
    />,
  );
  return onLogout;
}

describe("the admin top bar", () => {
  it("carries the sections on the same row as the mark and the way out", () => {
    showBar();

    const row = screen.getByLabelText(adminShell.logout).parentElement;

    expect(row?.querySelector("img")).toBeTruthy();
    expect(row?.textContent).toContain(adminTabs.members);
    expect(row?.textContent).toContain(adminTabs.money);
  });

  it("names the way out for a reader who cannot see the icon", () => {
    showBar();

    expect(screen.getByLabelText(adminShell.logout)).toBeTruthy();
  });

  it("logs out when the way out is pressed", () => {
    const onLogout = showBar();

    fireEvent.click(screen.getByLabelText(adminShell.logout));

    expect(onLogout).toHaveBeenCalled();
  });
});
