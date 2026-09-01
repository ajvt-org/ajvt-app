import { describe, it, expect } from "vitest";
import { ALL_TEAMS, NO_TEAM, inTeam, teamFilterOptions } from "./registrantFilter";
import type { Registration } from "./activityTypes";

function registration(team: Registration["team"]): Registration {
  return {
    id: "r1",
    status: "ACTIVE",
    paymentProof: null,
    rejectionReason: null,
    team,
    member: { id: "u1", fullName: "محمد", phone: null, age: "البدريين", photo: null },
  };
}

const shanaqita = { id: "t1", name: "الشناقطة" };
const sahel = { id: "t2", name: "أهل الساحل" };

describe("choosing which team to look at", () => {
  it("offers every team the activity has, even one nobody joined", () => {
    const labels = teamFilterOptions([shanaqita, sahel]).map((o) => o.label);

    expect(labels).toEqual(["كل الفرق", "الشناقطة", "أهل الساحل", "بلا فريق"]);
  });

  it("offers having no team as a choice of its own", () => {
    const values = teamFilterOptions([shanaqita]).map((o) => o.value);

    expect(values).toContain(NO_TEAM);
    expect(values[0]).toBe(ALL_TEAMS);
  });
});

describe("filtering the registrants by team", () => {
  it("keeps everybody when no team is chosen", () => {
    expect(inTeam(registration(shanaqita), ALL_TEAMS)).toBe(true);
    expect(inTeam(registration(null), ALL_TEAMS)).toBe(true);
  });

  it("keeps only the players of the team chosen", () => {
    expect(inTeam(registration(shanaqita), shanaqita.id)).toBe(true);
    expect(inTeam(registration(sahel), shanaqita.id)).toBe(false);
    expect(inTeam(registration(null), shanaqita.id)).toBe(false);
  });

  it("finds the people who still have no team", () => {
    expect(inTeam(registration(null), NO_TEAM)).toBe(true);
    expect(inTeam(registration(shanaqita), NO_TEAM)).toBe(false);
  });
});
