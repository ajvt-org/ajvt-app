import { describe, it, expect } from "vitest";
import { MEMBER_TABS, VISITOR_TABS, isTabActive, type Tab } from "@/lib/navigation";

function tab(href: string, also?: string[]): Tab {
  return { href, label: "x", icon: "trophy", also };
}

describe("isTabActive", () => {
  it("marks the tab whose page you are on", () => {
    expect(isTabActive(tab("/profile"), "/profile")).toBe(true);
  });

  it("leaves the other tabs alone", () => {
    expect(isTabActive(tab("/donate"), "/profile")).toBe(false);
  });

  it("stays lit on a page below the tab", () => {
    expect(isTabActive(tab("/activities"), "/activities/abc")).toBe(true);
  });

  it("stops at a segment boundary, so /home does not claim /homework", () => {
    expect(isTabActive(tab("/home"), "/homework")).toBe(false);
  });

  it("lights the tab a page was opened from even when the path is elsewhere", () => {
    expect(isTabActive(tab("/home", ["/activities"]), "/activities/abc")).toBe(true);
  });

  it("matches the root only exactly, since it prefixes every path", () => {
    expect(isTabActive(tab("/"), "/")).toBe(true);
    expect(isTabActive(tab("/"), "/donate")).toBe(false);
  });

  it("has nothing active before the pathname is known", () => {
    expect(isTabActive(tab("/profile"), null)).toBe(false);
  });
});

describe("the tab bars", () => {
  it("light exactly one tab per page they offer", () => {
    for (const tabs of [MEMBER_TABS, VISITOR_TABS]) {
      for (const t of tabs) {
        expect(tabs.filter((other) => isTabActive(other, t.href))).toEqual([t]);
      }
    }
  });

  it("light the activities tab on an activity page in both", () => {
    expect(MEMBER_TABS.filter((t) => isTabActive(t, "/activities/abc"))).toHaveLength(1);
    expect(VISITOR_TABS.filter((t) => isTabActive(t, "/activities/abc"))).toHaveLength(1);
  });
});
