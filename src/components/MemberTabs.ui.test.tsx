import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import MemberTabs from "./MemberTabs";

const noteReplacement = vi.fn();

let pathname = "/home";
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/lib/historyTrail", () => ({
  appTrail: { noteReplacement: (url: string) => noteReplacement(url) },
}));

function press(link: HTMLAnchorElement, options: MouseEventInit = {}) {
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...options }));
}

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
    noteReplacement.mockClear();
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

  it("stands in the current entry's place rather than on top of it", async () => {
    await visit("/home");

    expect(tab("الداعمون").hasAttribute("href")).toBe(true);
    press(tab("الداعمون"));

    expect(noteReplacement).toHaveBeenCalledWith("/leaderboard");
  });

  it("tells the trail the screen it is restoring, not the tab root", async () => {
    await visit("/activities/a1");
    await visit("/leaderboard");
    await waitFor(() => {
      expect(tab("الأنشطة").getAttribute("href")).toBe("/activities/a1");
    });

    press(tab("الأنشطة"));

    expect(noteReplacement).toHaveBeenCalledWith("/activities/a1");
  });

  it("leaves the trail alone for a click that asks for a new tab", async () => {
    await visit("/home");
    press(tab("الداعمون"), { metaKey: true });

    expect(noteReplacement).not.toHaveBeenCalled();
  });
});
