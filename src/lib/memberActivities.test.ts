import { describe, it, expect } from "vitest";
import { activityDetail, buildActivityRows, type MemberActivity } from "./memberActivities";
import type { Fixture } from "./memberFixtures";

function fixture(over: Partial<Fixture> = {}): Fixture {
  return {
    id: "m1",
    matchDate: "2026-09-01T16:00:00.000Z",
    round: null,
    venue: null,
    status: "SCHEDULED",
    isKnockout: false,
    homeTeam: { id: "t1", name: "النسور" },
    awayTeam: { id: "t2", name: "الصقور" },
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    activity: { id: "a1", title: "البطولة" },
    myTeamId: "t1",
    ...over,
  };
}

function entry(over: Partial<MemberActivity> = {}): MemberActivity {
  return {
    activityId: "a1",
    title: "البطولة",
    isTournament: true,
    isVolunteer: false,
    minTeamSize: null,
    maxTeamSize: null,
    dates: null,
    registrationStatus: "ACTIVE",
    team: null,
    fixtures: [],
    ...over,
  };
}

const team = { id: "t1", name: "النسور", autoNamed: false, teammates: [] as string[] };

describe("activityDetail", () => {
  it("leads with the next match when one is scheduled", () => {
    const d = activityDetail(entry({ team, fixtures: [fixture()] }));
    expect(d.kind).toBe("NEXT_MATCH");
  });

  it("ignores a played match when choosing the next one", () => {
    const d = activityDetail(entry({ team, fixtures: [fixture({ status: "PLAYED" })] }));
    expect(d).toEqual({ kind: "AWAITING_SCHEDULE", team: "النسور" });
  });

  it("names the partner in a fixed size team", () => {
    const d = activityDetail(
      entry({ minTeamSize: 2, maxTeamSize: 2, team: { ...team, teammates: ["محمد ولد أحمد"] } }),
    );
    expect(d).toEqual({ kind: "PARTNERS", names: ["محمد ولد أحمد"] });
  });

  it("says a tournament is waiting for a team when there is none", () => {
    expect(activityDetail(entry()).kind).toBe("AWAITING_TEAM");
  });

  it("shows the dates for an activity that is not a tournament", () => {
    const d = activityDetail(
      entry({ isTournament: false, isVolunteer: true, dates: "12 - 15 سبتمبر" }),
    );
    expect(d).toEqual({ kind: "DATES", text: "12 - 15 سبتمبر" });
  });

  it("puts a decision still pending ahead of everything else", () => {
    const d = activityDetail(entry({ registrationStatus: "PENDING", team, fixtures: [fixture()] }));
    expect(d.kind).toBe("PENDING_REVIEW");
  });

  it("says so when the registration was refused", () => {
    expect(activityDetail(entry({ registrationStatus: "REJECTED" })).kind).toBe("REJECTED");
  });
});

describe("buildActivityRows", () => {
  it("puts a scheduled match first, then waiting, then the rest", () => {
    const rows = buildActivityRows([
      entry({ activityId: "c", title: "القافلة", isTournament: false, dates: "12 سبتمبر" }),
      entry({ activityId: "b", title: "الشطرنج" }),
      entry({ activityId: "a", title: "البطولة", team, fixtures: [fixture()] }),
    ]);
    expect(rows.map((r) => r.activityId)).toEqual(["a", "b", "c"]);
  });

  it("orders two scheduled matches by kickoff", () => {
    const rows = buildActivityRows([
      entry({
        activityId: "late",
        team,
        fixtures: [fixture({ matchDate: "2026-09-05T16:00:00.000Z" })],
      }),
      entry({
        activityId: "soon",
        team,
        fixtures: [fixture({ matchDate: "2026-09-01T16:00:00.000Z" })],
      }),
    ]);
    expect(rows.map((r) => r.activityId)).toEqual(["soon", "late"]);
  });
});
