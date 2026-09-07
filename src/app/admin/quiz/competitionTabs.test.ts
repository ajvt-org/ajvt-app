import { describe, it, expect } from "vitest";
import { competitionTabSections, openingTab } from "./competitionTabs";

const keysOf = (competition: Parameters<typeof competitionTabSections>[0]) =>
  competitionTabSections(competition).flatMap((section) => section.tabs.map((tab) => tab.key));

describe("competition tabs", () => {
  it("offers only the settings while the competition is unsaved", () => {
    expect(keysOf(null)).toEqual(["settings"]);
    expect(openingTab(null)).toBe("settings");
  });

  it("leaves the participants out of a public competition", () => {
    expect(keysOf({ visibility: "PUBLIC", startedAt: null })).toEqual(["settings"]);
  });

  it("names the participants on a private competition", () => {
    expect(keysOf({ visibility: "PRIVATE", startedAt: null })).toEqual([
      "settings",
      "participants",
    ]);
  });

  it("holds the standings and the scores back until the competition starts", () => {
    expect(keysOf({ visibility: "PUBLIC", startedAt: null })).not.toContain("standings");
    expect(keysOf({ visibility: "PUBLIC", startedAt: "2026-08-20T08:00:00.000Z" })).toEqual([
      "settings",
      "standings",
      "scores",
    ]);
  });

  it("leaves a public competition that has not started with nothing to tab between", () => {
    expect(keysOf({ visibility: "PUBLIC", startedAt: null })).toHaveLength(1);
  });

  it("opens on the settings before the start and on the standings after it", () => {
    expect(openingTab({ visibility: "PUBLIC", startedAt: null })).toBe("settings");
    expect(openingTab({ visibility: "PUBLIC", startedAt: "2026-08-20T08:00:00.000Z" })).toBe(
      "standings",
    );
  });

  it("holds every tab of a started competition in one row", () => {
    const sections = competitionTabSections({
      visibility: "PRIVATE",
      startedAt: "2026-08-20T08:00:00.000Z",
    });

    expect(sections).toHaveLength(1);
    expect(sections[0].tabs.map((tab) => tab.key)).toEqual([
      "settings",
      "participants",
      "standings",
      "scores",
    ]);
  });
});
