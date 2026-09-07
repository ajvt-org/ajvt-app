import { describe, it, expect } from "vitest";
import {
  ACTIVITIES_VIEW_KEYS,
  DEFAULT_STAGE,
  activeFilterCount,
  axisViews,
  clearedActivitiesView,
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
    axisViews(activities, filters).find((a) => a.key === key);

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

describe("which filters can narrow the list", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    stage: "all",
    waiting: "",
    ...over,
  });

  const keys = (activities: Activity[], filters = view()) =>
    axisViews(activities, filters).map((a) => a.key);

  const usableAxes = (activities: Activity[], filters = view()) =>
    axisViews(activities, filters)
      .filter((a) => a.usable)
      .map((a) => a.key);

  const axisOf = (activities: Activity[], filters: ActivitiesView, key: string) =>
    axisViews(activities, filters).find((a) => a.key === key);

  const optionOf = (activities: Activity[], filters: ActivitiesView, key: string, value: string) =>
    axisOf(activities, filters, key)?.options.find((o) => o.value === value);

  it("keeps every row on the card whatever is chosen, so nothing moves under a thumb", () => {
    const allOpenTournaments = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
    ];
    const mixed = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "p1" }),
      activity({ id: "c1", isOpen: false }),
    ];

    expect(keys(allOpenTournaments)).toEqual(["type", "state", "stage"]);
    expect(keys(mixed)).toEqual(["type", "state", "stage"]);
    expect(keys(mixed, view({ type: "tournament" }))).toEqual(["type", "state", "stage"]);
  });

  it("does not offer an axis whose every option gives the list it already shows", () => {
    const allOpenTournaments = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
    ];

    expect(usableAxes(allOpenTournaments)).toEqual([]);
  });

  it("offers an axis that can actually narrow the list", () => {
    const mixed = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "p1" }),
      activity({ id: "c1", isOpen: false }),
    ];

    expect(usableAxes(mixed)).toEqual(["type", "state"]);
  });

  it("offers the stage axis only when something has finished", () => {
    const running = [activity({ id: "a1" })];
    const withFinished = [
      activity({ id: "a1" }),
      activity({
        id: "a2",
        startsAt: "2020-01-01T00:00:00.000Z",
        endsAt: "2020-01-02T00:00:00.000Z",
      }),
    ];

    expect(usableAxes(running, view({ stage: "current" }))).not.toContain("stage");
    expect(usableAxes(withFinished, view({ stage: "current" }))).toContain("stage");
  });

  it("never stops offering the row a reader has already pressed", () => {
    const rowsWithNoCampaign = [activity({ id: "t1", isTournament: true })];

    expect(axisOf(rowsWithNoCampaign, view({ type: "volunteer" }), "type")?.usable).toBe(true);
  });

  it("keeps offering a filter a reader has set for as long as releasing it would change the list", () => {
    const rowsWithNoCampaign = [activity({ id: "t1", isTournament: true })];
    const allTournaments = [
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
    ];

    expect(axisOf(rowsWithNoCampaign, view({ type: "tournament" }), "type")?.usable).toBe(false);
    expect(axisOf(allTournaments, view({ type: "volunteer" }), "type")?.usable).toBe(true);
  });

  it("offers nothing on a list nothing is left of, and still shows every row", () => {
    const mixed = [activity({ id: "t1", isTournament: true }), activity({ id: "p1" })];
    const nothingMatches = view({ q: "لا شيء" });

    expect(keys(mixed, nothingMatches)).toEqual(["type", "state", "stage"]);
    expect(usableAxes(mixed, nothingMatches)).toEqual([]);
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

describe("how many filters the address is carrying", () => {
  const view = (over: Partial<ActivitiesView> = {}): ActivitiesView => ({
    q: "",
    type: "",
    state: "",
    stage: DEFAULT_STAGE,
    waiting: "",
    ...over,
  });

  it("counts nothing on the view a bare address gives", () => {
    expect(activeFilterCount(view())).toBe(0);
  });

  it("counts each axis a reader has moved off what it starts on", () => {
    expect(activeFilterCount(view({ type: "tournament" }))).toBe(1);
    expect(activeFilterCount(view({ type: "tournament", stage: "finished" }))).toBe(2);
    expect(activeFilterCount(view({ type: "tournament", state: "open", stage: "all" }))).toBe(3);
  });

  it("leaves the search out of the count, since it has its own box", () => {
    expect(activeFilterCount(view({ q: "دوري" }))).toBe(0);
  });

  it("gives back the view a bare address would give, and keeps the search", () => {
    expect(clearedActivitiesView(view({ q: "دوري", type: "tournament", stage: "all" }))).toEqual(
      view({ q: "دوري" }),
    );
  });

  it("clears to something the address writes as nothing", () => {
    const cleared = clearedActivitiesView(view({ type: "tournament", state: "open" }));

    expect(writeActivitiesView(cleared).toString()).toBe("");
    expect(activeFilterCount(cleared)).toBe(0);
  });
});
