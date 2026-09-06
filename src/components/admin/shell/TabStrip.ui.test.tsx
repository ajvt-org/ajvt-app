import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MONEY_AREAS } from "@/lib/adminNav";
import { adminTabs } from "@/lib/texts";
import TabStrip from "./TabStrip";
import SubTabStrip from "./SubTabStrip";
import { subtabsFor, tabsFor } from "./navTabs";

const PENDING = { members: 0, activityWork: 0, donations: 4 };

function showStrip(role: string, pathname: string, onOpen = vi.fn()) {
  cleanup();
  render(<TabStrip tabs={tabsFor(role)} pathname={pathname} pending={PENDING} onOpen={onOpen} />);
  return onOpen;
}

function showSubtabs(role: string, pathname: string, onOpen = vi.fn()) {
  cleanup();
  render(<SubTabStrip tabs={subtabsFor(role, pathname)} pathname={pathname} onOpen={onOpen} />);
  return onOpen;
}

describe("the admin tab strip", () => {
  it("names the money tab once instead of every money screen", () => {
    showStrip("SUPER", "/admin/dashboard");

    expect(screen.getByText(adminTabs.money)).toBeTruthy();
    expect(screen.queryByText(adminTabs.treasury)).toBeNull();
    expect(screen.queryByText(adminTabs.payments)).toBeNull();
  });

  it("marks the money tab as the current one on a money screen", () => {
    showStrip("SUPER", MONEY_AREAS.treasury);

    const money = screen.getByText(adminTabs.money).closest("button");
    expect(money?.getAttribute("aria-current")).toBe("page");
  });

  it("carries the payments count on the money tab", () => {
    showStrip("SUPER", "/admin/dashboard");

    const money = screen.getByText(adminTabs.money).closest("button");
    expect(money?.textContent).toContain("4");
  });

  it("opens the money tab on the first screen the role is granted", () => {
    const onOpen = showStrip("MEMBERS", "/admin/dashboard");

    fireEvent.click(screen.getByText(adminTabs.money));

    expect(onOpen).toHaveBeenCalledWith(MONEY_AREAS.payments);
  });
});

describe("the money subtabs", () => {
  it("gives a full access admin every money screen", () => {
    showSubtabs("SUPER", MONEY_AREAS.payments);

    for (const label of [
      adminTabs.payments,
      adminTabs.receipts,
      adminTabs.expenses,
      adminTabs.treasury,
      adminTabs.financeReport,
    ]) {
      expect(screen.getByText(label), label).toBeTruthy();
    }
  });

  it("leaves the treasury and the report out for a members admin", () => {
    showSubtabs("MEMBERS", MONEY_AREAS.payments);

    expect(screen.getByText(adminTabs.payments)).toBeTruthy();
    expect(screen.queryByText(adminTabs.treasury)).toBeNull();
    expect(screen.queryByText(adminTabs.financeReport)).toBeNull();
  });

  it("marks the screen being read", () => {
    showSubtabs("SUPER", MONEY_AREAS.expenses);

    expect(
      screen.getByText(adminTabs.expenses).closest("button")?.getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByText(adminTabs.receipts).closest("button")?.getAttribute("aria-current"),
    ).toBeNull();
  });

  it("opens the screen it was asked for", () => {
    const onOpen = showSubtabs("SUPER", MONEY_AREAS.payments);

    fireEvent.click(screen.getByText(adminTabs.treasury));

    expect(onOpen).toHaveBeenCalledWith(MONEY_AREAS.treasury);
  });

  it("underlines the screen being read instead of filling it like a top tab", () => {
    showSubtabs("SUPER", MONEY_AREAS.payments);

    const current = screen.getByText(adminTabs.payments).closest("button");
    const other = screen.getByText(adminTabs.treasury).closest("button");

    expect(current?.style.borderBottom).toContain("var(--mint-600)");
    expect(current?.style.background).toBe("");
    expect(other?.style.borderBottom).toContain("transparent");
  });

  it("carries no icon, so the level does not repeat the strip above it", () => {
    showSubtabs("SUPER", MONEY_AREAS.payments);

    expect(screen.getByText(adminTabs.payments).closest("button")?.querySelector("svg")).toBeNull();
  });
});
