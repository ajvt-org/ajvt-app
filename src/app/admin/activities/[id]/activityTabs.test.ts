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
