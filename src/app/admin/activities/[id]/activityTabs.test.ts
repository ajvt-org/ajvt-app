import { describe, it, expect } from "vitest";
import { activityTabSections, type TabbedActivity } from "./activityTabs";
import type { WorkspaceTab } from "@/components/admin/WorkspaceTabs";

function activity(over: Partial<TabbedActivity> = {}): TabbedActivity {
  return {
    isVolunteer: false,
    isTournament: false,
    matchShape: "FOOTBALL",
    minTeamSize: null,
    maxTeamSize: null,
    registrations: [],
    ...over,
  };
}

const flat = (a: TabbedActivity, proposals = 0): WorkspaceTab[] =>
  activityTabSections(a, proposals).flatMap((section) => section.tabs);

const keys = (a: TabbedActivity, proposals = 0) => flat(a, proposals).map((t) => t.key);

describe("the people section of a singles tournament", () => {
  const singles = activity({ isTournament: true, minTeamSize: 1, maxTeamSize: 1 });
  const squad = activity({ isTournament: true, minTeamSize: 5, maxTeamSize: 7 });

  it("holds one list, since a registrant is a player", () => {
    const people = activityTabSections(singles, 0).find((section) => section.key === "people");

    expect(people?.tabs.map((tab) => tab.key)).toEqual(["registrations"]);
  });

  it("keeps both lists on a tournament with real teams", () => {
    const people = activityTabSections(squad, 0).find((section) => section.key === "people");

    expect(people?.tabs.map((tab) => tab.key)).toEqual(["registrations", "teams"]);
  });

  it("leaves the rest of a singles tournament alone", () => {
    expect(keys(singles)).toContain("matches");
    expect(keys(singles)).toContain("standings");
  });
});

describe("the tabs an activity opens with", () => {
  it("takes registrations on an ordinary activity", () => {
    expect(keys(activity())).toContain("registrations");
  });

  it("leaves them out of a campaign that never had any", () => {
    expect(keys(activity({ isVolunteer: true }))).not.toContain("registrations");
  });

  it("keeps them on a campaign converted from an activity that had some", () => {
    const converted = activity({ isVolunteer: true, registrations: [{ status: "PENDING" }] });

    expect(keys(converted)).toContain("registrations");
  });

  it("keeps them on a campaign whose registrations were already settled", () => {
    const converted = activity({ isVolunteer: true, registrations: [{ status: "ACTIVE" }] });

    expect(keys(converted)).toContain("registrations");
  });

  it("counts only what is still waiting on the badge", () => {
    const rows = [{ status: "PENDING" }, { status: "PENDING" }, { status: "ACTIVE" }];
    const tabs = flat(activity({ registrations: rows }), 0);

    expect(tabs.find((t) => t.key === "registrations")?.badge).toBe(2);
  });

  it("adds the tournament tabs only for a tournament", () => {
    expect(keys(activity())).not.toContain("matches");
    expect(keys(activity({ isTournament: true }))).toContain("matches");
  });

  it("always ends on finance and the log", () => {
    expect(keys(activity()).slice(-2)).toEqual(["finance", "log"]);
  });
});
