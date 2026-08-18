import { describe, it, expect } from "vitest";
import { ACTIVITIES_VIEW_KEYS, readActivitiesView, writeActivitiesView } from "./activitiesView";

describe("carrying which activity card is open in the address", () => {
  it("reads an empty query as nothing expanded", () => {
    expect(readActivitiesView(new URLSearchParams())).toEqual({ expanded: "" });
  });

  it("writes nothing when nothing is expanded", () => {
    expect(writeActivitiesView({ expanded: "" }).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = { expanded: "activity-1" };
    expect(readActivitiesView(new URLSearchParams(writeActivitiesView(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("lists exactly the key it owns in the address", () => {
    expect(ACTIVITIES_VIEW_KEYS).toEqual(["activity"]);
  });
});
