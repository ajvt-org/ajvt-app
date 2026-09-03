import { describe, it, expect } from "vitest";
import {
  ACTIVITIES_VIEW_KEYS,
  countForOption,
  DEFAULT_STAGE,
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
    published: true,
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
    stage: "all",
    waiting: "",
    ...over,
  });

  it("shows what is running before what is over when the address says nothing", () => {
    expect(readActivitiesView(new URLSearchParams())).toEqual(view({ stage: DEFAULT_STAGE }));
  });

  it("keeps the stage out of the address while it is the one you get by default", () => {
    expect(writeActivitiesView(view({ stage: DEFAULT_STAGE })).toString()).toBe("");
    expect(writeActivitiesView(view({ stage: "finished" })).toString()).toBe("stage=finished");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = view({ q: "دوري", type: "tournament", state: "open", stage: "finished" });

    expect(readActivitiesView(new URLSearchParams(writeActivitiesView(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("lists exactly the keys it owns in the address", () => {
    expect(ACTIVITIES_VIEW_KEYS).toEqual(["q", "type", "state", "stage", "waiting"]);
  });
});

describe("narrowing the list", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    stage: "all",
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

  it("tells what is over from what is still to come", () => {
    const now = new Date("2026-08-20T00:00:00.000Z");
    const over = activity({ startsAt: "2026-08-01", endsAt: "2026-08-05" });
    const ahead = activity({ startsAt: "2026-09-01", endsAt: "2026-09-05" });

    expect(matchesActivitiesView(over, view({ stage: "finished" }), now)).toBe(true);
    expect(matchesActivitiesView(ahead, view({ stage: "finished" }), now)).toBe(false);
    expect(matchesActivitiesView(ahead, view({ stage: "current" }), now)).toBe(true);
    expect(matchesActivitiesView(over, view({ stage: "current" }), now)).toBe(false);
  });
});

describe("what a chip says it would show", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    stage: "all",
    waiting: "",
    ...over,
  });

  const rows = [
    activity({ id: "t1", isTournament: true }),
    activity({ id: "t2", isTournament: true, isOpen: false }),
    activity({ id: "v1", isVolunteer: true }),
  ];

  it("counts what picking it would leave", () => {
    expect(countForOption(rows, view(), "type", "tournament")).toBe(2);
    expect(countForOption(rows, view(), "type", "volunteer")).toBe(1);
    expect(countForOption(rows, view(), "type", "")).toBe(3);
  });

  it("counts against the filters already chosen, not the whole list", () => {
    const open = view({ state: "open" });

    expect(countForOption(rows, open, "type", "tournament")).toBe(1);
  });

  it("says nothing would be left rather than leaving the reader to find out", () => {
    expect(countForOption(rows, view({ state: "closed" }), "type", "volunteer")).toBe(0);
  });

  it("does not let the axis being counted narrow itself", () => {
    const chosen = view({ type: "volunteer" });

    expect(countForOption(rows, chosen, "type", "tournament")).toBe(2);
  });
});
