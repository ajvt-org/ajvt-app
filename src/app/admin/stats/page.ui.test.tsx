import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import AdminDataPage from "./page";
import { adminTabs, dataExport, dataPage, siteVisits } from "@/lib/texts";

const replace = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(query),
}));

const stats = {
  days: [{ date: "2026-09-01", visitors: 4, pageViews: 9 }],
  today: 4,
  yesterday: 2,
  last7Days: 11,
  last30Days: 30,
};

beforeEach(() => {
  cleanup();
  query = "";
  replace.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(stats) }),
  );
});

function shown(tab = "") {
  cleanup();
  query = tab ? `tab=${tab}` : "";
  return render(<AdminDataPage />).container;
}

const tabsOf = (container: HTMLElement) => [
  ...(container.querySelector(".tab-strip") as HTMLElement).querySelectorAll("button"),
];

describe("the two readings البيانات holds", () => {
  it("offers them in one strip, the visits then the export", () => {
    const container = shown();

    expect(tabsOf(container).map((b) => b.textContent?.trim())).toEqual([
      dataPage.visitsTab,
      dataPage.exportTab,
    ]);
  });

  it("is named after the records rather than after one reading of them", () => {
    expect(adminTabs.stats).not.toBe(dataPage.visitsTab);
  });

  it("lands on the visits when the address names no tab", async () => {
    shown();

    expect(await screen.findByText(siteVisits.title)).toBeDefined();
  });

  it("falls back to the visits when the address names a tab that is not there", async () => {
    shown("nowhere");

    expect(await screen.findByText(siteVisits.title)).toBeDefined();
  });

  it("holds the export, which used to sit under the settings", () => {
    const container = shown("export");

    expect(screen.getByText(dataExport.title)).toBeDefined();
    expect(container.querySelector("a[href='/api/admin/export/members']")).not.toBeNull();
  });

  it("shows one reading at a time", async () => {
    const visits = shown();
    await waitFor(() => expect(screen.getByText(siteVisits.title)).toBeDefined());
    expect(visits.querySelector("a[href='/api/admin/export/members']")).toBeNull();

    const exported = shown("export");
    expect(exported.querySelector("a[href='/api/admin/export/members']")).not.toBeNull();
    expect(screen.queryByText(siteVisits.title)).toBeNull();
  });

  it("asks the server for nothing the export needs", () => {
    shown("export");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("writes the chosen tab into the address so a reload lands on it", () => {
    const container = shown();

    fireEvent.click(tabsOf(container)[1]);

    expect(replace).toHaveBeenCalledWith("/admin/stats?tab=export", { scroll: false });
  });

  it("marks the tab being read", () => {
    const container = shown("export");
    const marked = tabsOf(container).filter((b) => b.getAttribute("aria-current") === "page");

    expect(marked.map((b) => b.textContent?.trim())).toEqual([dataPage.exportTab]);
  });

  it("draws one strip, since two tabs are one section", () => {
    const container = shown();

    expect(container.querySelectorAll(".tab-strip")).toHaveLength(1);
  });
});
