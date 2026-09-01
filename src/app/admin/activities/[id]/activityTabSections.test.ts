import { describe, it, expect } from "vitest";
import { activityTabSections, type TabbedActivity } from "./activityTabs";

function activity(over: Partial<TabbedActivity> = {}): TabbedActivity {
  return {
    isVolunteer: false,
    isTournament: false,
    profile: "FOOTBALL",
    teamSize: null,
    registrations: [],
    ...over,
  };
}

const SHAPES: Record<string, TabbedActivity> = {
  plain: activity(),
  campaign: activity({ isVolunteer: true }),
  football: activity({ isTournament: true, profile: "FOOTBALL", teamSize: 11 }),
  board: activity({ isTournament: true, profile: "BOARD", teamSize: 2 }),
  singles: activity({ isTournament: true, profile: "BOARD", teamSize: 1 }),
};

function placeOf(a: TabbedActivity): Record<string, string> {
  const places: Record<string, string> = {};
  for (const section of activityTabSections(a, 0, 0)) {
    section.tabs.forEach((tab, index) => {
      places[tab.key] = `${section.key}:${index}`;
    });
  }
  return places;
}

describe("a tab keeps its place whatever the activity is", () => {
  it("never puts the same tab in two different places", () => {
    const seen: Record<string, { place: string; shape: string }> = {};
    const clashes: string[] = [];

    for (const [shape, a] of Object.entries(SHAPES)) {
      for (const [key, place] of Object.entries(placeOf(a))) {
        const first = seen[key];
        if (!first) {
          seen[key] = { place, shape };
        } else if (first.place !== place) {
          clashes.push(
            `${key} sits at ${first.place} on ${first.shape} and at ${place} on ${shape}`,
          );
        }
      }
    }

    expect(clashes).toEqual([]);
  });

  it("holds the money and the trail still, which is what used to move", () => {
    for (const a of Object.values(SHAPES)) {
      const places = placeOf(a);
      expect(places.finance).toBe("records:0");
      expect(places.log).toBe("records:1");
    }
  });

  it("keeps the sections in one order and drops the ones with nothing in them", () => {
    const keys = (a: TabbedActivity) => activityTabSections(a, 0, 0).map((s) => s.key);

    expect(keys(SHAPES.football)).toEqual(["setup", "people", "play", "records"]);
    expect(keys(SHAPES.plain)).toEqual(["setup", "people", "records"]);
    expect(keys(SHAPES.campaign)).toEqual(["setup", "records"]);
  });

  it("puts the roster beside the registrations rather than with the play", () => {
    const people = activityTabSections(SHAPES.football, 0, 0).find((s) => s.key === "people");

    expect(people?.tabs.map((t) => t.key)).toEqual(["registrations", "teams"]);
  });

  it("gives every section a name", () => {
    for (const section of activityTabSections(SHAPES.football, 0, 0)) {
      expect(section.label.trim()).not.toBe("");
    }
  });
});
