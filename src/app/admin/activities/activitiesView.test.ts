import { describe, it, expect } from "vitest";
import {
  ACTIVITIES_VIEW_KEYS,
  matchesActivitiesView,
  readActivitiesView,
  writeActivitiesView,
  type ActivitiesView,
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
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    waiting: "",
    ...over,
  });

  it("reads an empty query as no opinion", () => {
    expect(readActivitiesView(new URLSearchParams())).toEqual(view());
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = view({ q: "دوري", type: "tournament", state: "open" });

    expect(readActivitiesView(new URLSearchParams(writeActivitiesView(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(ACTIVITIES_VIEW_KEYS).toEqual(["q", "type", "state", "waiting"]);
  });
});

describe("narrowing the list", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    waiting: "",
    ...over,
  });

  it("matches by title text", () => {
    expect(matchesActivitiesView(activity(), view({ q: "دوري" }))).toBe(true);
    expect(matchesActivitiesView(activity(), view({ q: "حملة" }))).toBe(false);
  });

  it("keeps each type to itself", () => {
    expect(
      matchesActivitiesView(activity({ isTournament: true }), view({ type: "tournament" })),
    ).toBe(true);
    expect(matchesActivitiesView(activity(), view({ type: "tournament" }))).toBe(false);
    expect(
      matchesActivitiesView(activity({ isVolunteer: true }), view({ type: "volunteer" })),
    ).toBe(true);
  });

  it("counts an activity that is neither a tournament nor a campaign as ordinary", () => {
    expect(matchesActivitiesView(activity(), view({ type: "plain" }))).toBe(true);
    expect(matchesActivitiesView(activity({ isTournament: true }), view({ type: "plain" }))).toBe(
      false,
    );
    expect(matchesActivitiesView(activity({ isVolunteer: true }), view({ type: "plain" }))).toBe(
      false,
    );
  });

  it("tells an open registration from a closed one", () => {
    expect(matchesActivitiesView(activity(), view({ state: "open" }))).toBe(true);
    expect(matchesActivitiesView(activity({ isOpen: false }), view({ state: "open" }))).toBe(false);
    expect(matchesActivitiesView(activity({ isOpen: false }), view({ state: "closed" }))).toBe(
      true,
    );
    expect(matchesActivitiesView(activity(), view({ state: "closed" }))).toBe(false);
  });

  it("puts the type and the state together rather than choosing between them", () => {
    const openTournament = activity({ isTournament: true, isOpen: true });
    const closedTournament = activity({ isTournament: true, isOpen: false });
    const chosen = view({ type: "tournament", state: "open" });

    expect(matchesActivitiesView(openTournament, chosen)).toBe(true);
    expect(matchesActivitiesView(closedTournament, chosen)).toBe(false);
  });

  it("asks for everything when neither is chosen", () => {
    expect(matchesActivitiesView(activity({ isVolunteer: true, isOpen: false }), view())).toBe(
      true,
    );
  });
});
