import { describe, it, expect } from "vitest";
import { MEMBER_TABS } from "./navigation";
import { remember, sectionOf, tabTarget, type TabMemory } from "./tabMemory";

const ACTIVITIES = MEMBER_TABS.find((t) => t.label === "الأنشطة")!;
const SUPPORTERS = MEMBER_TABS.find((t) => t.label === "الداعمون")!;

describe("sectionOf", () => {
  it("maps a nested path to the tab that owns it", () => {
    expect(sectionOf("/activities/a1", MEMBER_TABS)).toBe("/home");
    expect(sectionOf("/quiz", MEMBER_TABS)).toBe("/home");
    expect(sectionOf("/leaderboard", MEMBER_TABS)).toBe("/leaderboard");
  });

  it("owns no section for a path outside every tab", () => {
    expect(sectionOf("/login", MEMBER_TABS)).toBeNull();
  });
});

describe("remember", () => {
  it("stores the deepest visited path under its section", () => {
    const memory = remember({}, MEMBER_TABS, "/activities/a1");
    expect(memory["/home"]).toBe("/activities/a1");
  });

  it("keeps the query string with the path", () => {
    const memory = remember({}, MEMBER_TABS, "/quiz", "?competition=c1");
    expect(memory["/home"]).toBe("/quiz?competition=c1");
  });

  it("leaves other sections untouched", () => {
    const before: TabMemory = { "/leaderboard": "/leaderboard" };
    const memory = remember(before, MEMBER_TABS, "/activities/a1");
    expect(memory["/leaderboard"]).toBe("/leaderboard");
  });

  it("changes nothing for a path outside every tab", () => {
    const before: TabMemory = {};
    expect(remember(before, MEMBER_TABS, "/login")).toBe(before);
  });

  it("returns the same object when nothing moved", () => {
    const before = remember({}, MEMBER_TABS, "/activities/a1");
    expect(remember(before, MEMBER_TABS, "/activities/a1")).toBe(before);
  });
});

describe("tabTarget", () => {
  it("sends a tap on another tab to where the member left it", () => {
    const memory = remember({}, MEMBER_TABS, "/activities/a1");
    expect(tabTarget(ACTIVITIES, memory, "/leaderboard")).toBe("/activities/a1");
  });

  it("sends a tap on the current tab to its root, which is the reset", () => {
    const memory = remember({}, MEMBER_TABS, "/activities/a1");
    expect(tabTarget(ACTIVITIES, memory, "/activities/a1")).toBe("/home");
  });

  it("falls back to the root when nothing is remembered", () => {
    expect(tabTarget(SUPPORTERS, {}, "/home")).toBe("/leaderboard");
  });
});
