import { describe, it, expect } from "vitest";
import {
  ACTIVITIES_VIEW_KEYS,
  matchesActivitiesView,
  readActivitiesView,
  writeActivitiesView,
} from "./activitiesView";
import type { Activity } from "./activityTypes";

function activity(over: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    title: "دوري القرية",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    isTournament: false,
    isVolunteer: false,
    whatsappLink: null,
    order: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    registrations: [],
    pendingJoinRequests: 0,
    ...over,
  };
}

describe("carrying the activities search in the address", () => {
  it("reads an empty query as no opinion", () => {
    expect(readActivitiesView(new URLSearchParams())).toEqual({ q: "", kind: "", waiting: "" });
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = { q: "دوري", kind: "tournament", waiting: "" };
    expect(readActivitiesView(new URLSearchParams(writeActivitiesView(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(ACTIVITIES_VIEW_KEYS).toEqual(["q", "kind", "waiting"]);
  });
});

describe("narrowing the list", () => {
  it("matches by title text", () => {
    expect(matchesActivitiesView(activity(), { q: "دوري", kind: "", waiting: "" })).toBe(true);
    expect(matchesActivitiesView(activity(), { q: "حملة", kind: "", waiting: "" })).toBe(false);
  });

  it("keeps each kind to itself", () => {
    expect(
      matchesActivitiesView(activity({ isTournament: true }), {
        q: "",
        kind: "tournament",
        waiting: "",
      }),
    ).toBe(true);
    expect(matchesActivitiesView(activity(), { q: "", kind: "tournament", waiting: "" })).toBe(
      false,
    );
    expect(
      matchesActivitiesView(activity({ isVolunteer: true }), {
        q: "",
        kind: "volunteer",
        waiting: "",
      }),
    ).toBe(true);
    expect(
      matchesActivitiesView(activity({ isOpen: false }), { q: "", kind: "open", waiting: "" }),
    ).toBe(false);
  });
});
