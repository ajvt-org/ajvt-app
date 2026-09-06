import { describe, it, expect } from "vitest";
import {
  ACTIVITIES_VIEW_KEYS,
  DEFAULT_STAGE,
  offeredAxes,
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
    activity({ id: "p1", isOpen: false }),
  ];

  const axis = (activities: Activity[], filters: ActivitiesView, key: string) =>
    offeredAxes(activities, filters).find((a) => a.key === key);

  const countOf = (activities: Activity[], filters: ActivitiesView, key: string, value: string) =>
    axis(activities, filters, key)?.options.find((o) => o.value === value)?.count;

  it("counts what picking it would leave", () => {
    expect(countOf(rows, view(), "type", "tournament")).toBe(2);
    expect(countOf(rows, view(), "type", "volunteer")).toBe(1);
    expect(countOf(rows, view(), "type", "")).toBe(4);
  });

  it("counts against the filters already chosen, not the whole list", () => {
    expect(countOf(rows, view({ state: "open" }), "type", "tournament")).toBe(1);
  });

  it("says nothing would be left rather than leaving the reader to find out", () => {
    expect(countOf(rows, view({ state: "closed" }), "type", "volunteer")).toBe(0);
  });

  it("does not let the axis being counted narrow itself", () => {
    expect(countOf(rows, view({ type: "volunteer" }), "type", "tournament")).toBe(2);
  });
});

describe("which filters are worth offering", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    stage: "all",
    waiting: "",
    ...over,
  });

  const keys = (activities: Activity[], filters = view()) =>
    offeredAxes(activities, filters).map((a) => a.key);

  const optionOf = (activities: Activity[], filters: ActivitiesView, key: string, value: string) =>
    offeredAxes(activities, filters)
      .find((a) => a.key === key)
      ?.options.find((o) => o.value === value);

  it("drops an axis whose every option gives the list it already shows", () => {
    const allOpenTournaments = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
    ];

    expect(keys(allOpenTournaments)).toEqual([]);
  });

  it("keeps an axis that can actually narrow the list", () => {
    const mixed = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "p1" }),
      activity({ id: "c1", isOpen: false }),
    ];

    expect(keys(mixed)).toEqual(["type", "state"]);
  });

  it("keeps the stage axis only when something has finished", () => {
    const running = [activity({ id: "a1" })];
    const withFinished = [
      activity({ id: "a1" }),
      activity({
        id: "a2",
        startsAt: "2020-01-01T00:00:00.000Z",
        endsAt: "2020-01-02T00:00:00.000Z",
      }),
    ];

    expect(keys(running, view({ stage: "current" }))).not.toContain("stage");
    expect(keys(withFinished, view({ stage: "current" }))).toContain("stage");
  });

  it("never takes away the row a reader has already pressed", () => {
    const rowsWithNoCampaign = [activity({ id: "t1", isTournament: true })];

    expect(keys(rowsWithNoCampaign, view({ type: "volunteer" }))).toContain("type");
  });

  it("leaves the way out pressable when the chosen filter empties the list", () => {
    const rowsWithNoCampaign = [activity({ id: "t1", isTournament: true })];
    const chosen = view({ type: "volunteer" });

    expect(optionOf(rowsWithNoCampaign, chosen, "type", "")?.usable).toBe(true);
    expect(optionOf(rowsWithNoCampaign, chosen, "type", "volunteer")?.usable).toBe(true);
  });

  it("marks an option that would show nothing as not a way to see anything", () => {
    const mixed = [activity({ id: "t1", isTournament: true }), activity({ id: "p1" })];

    expect(optionOf(mixed, view(), "type", "volunteer")?.usable).toBe(false);
    expect(optionOf(mixed, view(), "type", "tournament")?.usable).toBe(true);
  });
});
