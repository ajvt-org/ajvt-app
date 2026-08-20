import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import MemberTabs from "./MemberTabs";

let pathname = "/home";
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

async function visit(nextPathname: string, nextSearch = "") {
  cleanup();
  pathname = nextPathname;
  search = nextSearch;
  render(<MemberTabs />);
  await waitFor(() => {
    expect(tab("الأنشطة")).toBeDefined();
  });
}

function tab(label: string): HTMLAnchorElement {
  return screen.getByText(label).closest("a") as HTMLAnchorElement;
}

describe("MemberTabs", () => {
  beforeEach(() => {
    sessionStorage.clear();
    pathname = "/home";
    search = "";
  });

  it("marks the tab that owns the current path", async () => {
    await visit("/activities/a1");

    expect(tab("الأنشطة").getAttribute("aria-current")).toBe("page");
    expect(tab("الداعمون").getAttribute("aria-current")).toBeNull();
  });

  it("brings the member back to where they left a tab", async () => {
    await visit("/activities/a1");
    await visit("/leaderboard");

    await waitFor(() => {
      expect(tab("الأنشطة").getAttribute("href")).toBe("/activities/a1");
    });
  });

  it("keeps the query string, so a quiz competition survives the round trip", async () => {
    await visit("/quiz", "competition=c1");
    await visit("/donate");

    await waitFor(() => {
      expect(tab("الأنشطة").getAttribute("href")).toBe("/quiz?competition=c1");
    });
  });

  it("resets to the root when the member taps the tab they are already in", async () => {
    await visit("/activities/a1");

    await waitFor(() => {
      expect(tab("الأنشطة").getAttribute("href")).toBe("/home");
    });
  });

  it("points at the roots when nothing has been visited", async () => {
    await visit("/home");

    expect(tab("الداعمون").getAttribute("href")).toBe("/leaderboard");
    expect(tab("ادعم").getAttribute("href")).toBe("/donate");
  });
});
