import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor, screen } from "@testing-library/react";
import { MONEY_AREAS } from "@/lib/adminNav";
import { adminTabs } from "@/lib/texts";
import TabStrip from "./TabStrip";
import SubTabStrip from "./SubTabStrip";
import { subtabsFor, tabsFor } from "./navTabs";

const PENDING = { members: 0, activityWork: 0, donations: 0 };

let brought: string[] = [];

beforeEach(() => {
  brought = [];
  Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
    brought.push(this.textContent?.trim() ?? "");
  };
});

afterEach(() => {
  cleanup();
});

describe("a strip narrower than the tabs it holds", () => {
  it("brings the current destination into view", async () => {
    render(
      <TabStrip
        tabs={tabsFor("SUPER")}
        pathname={MONEY_AREAS.treasury}
        pending={PENDING}
        onOpen={vi.fn()}
      />,
    );

    await waitFor(() => expect(brought).toContain(adminTabs.money));
  });

  it("brings the current money screen into view", async () => {
    render(
      <SubTabStrip
        tabs={subtabsFor("SUPER", MONEY_AREAS.treasury)}
        pathname={MONEY_AREAS.treasury}
        onOpen={vi.fn()}
      />,
    );

    await waitFor(() => expect(brought).toContain(adminTabs.treasury));
    expect(brought).not.toContain(adminTabs.payments);
  });

  it("brings nothing into view when the strip holds no current destination", async () => {
    render(
      <SubTabStrip
        tabs={subtabsFor("SUPER", MONEY_AREAS.payments)}
        pathname="/admin/dashboard"
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(adminTabs.payments)).toBeTruthy();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(brought).toEqual([]);
  });
});
