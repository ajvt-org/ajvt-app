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
    expect(keysOf({ visibility: "PUBLIC", startedAt: null })).toEqual(["settings", "rounds"]);
  });

  it("names the participants on a private competition", () => {
    expect(keysOf({ visibility: "PRIVATE", startedAt: null })).toEqual([
      "settings",
      "participants",
      "rounds",
    ]);
  });

  it("holds the standings and the scores back until the competition starts", () => {
    expect(keysOf({ visibility: "PUBLIC", startedAt: null })).not.toContain("standings");
    expect(keysOf({ visibility: "PUBLIC", startedAt: "2026-08-20T08:00:00.000Z" })).toEqual([
      "settings",
      "rounds",
      "standings",
      "scores",
    ]);
  });

  it("opens on the rounds before the start and on the standings after it", () => {
    expect(openingTab({ visibility: "PUBLIC", startedAt: null })).toBe("rounds");
    expect(openingTab({ visibility: "PUBLIC", startedAt: "2026-08-20T08:00:00.000Z" })).toBe(
      "standings",
    );
  });

  it("splits the setup from what is watched once it runs", () => {
    const sections = competitionTabSections({
      visibility: "PRIVATE",
      startedAt: "2026-08-20T08:00:00.000Z",
    });

    expect(sections.map((section) => section.key)).toEqual(["setup", "run"]);
  });
});
