import { describe, it, expect } from "vitest";
import {
  NOTHING_PICKED,
  hasTeamFilter,
  inTeam,
  pickedLabels,
  teamFilterSummary,
  toggleNoTeam,
  toggleTeam,
} from "./registrantFilter";
import type { Registration } from "./activityTypes";

function registration(team: Registration["team"]): Registration {
  return {
    id: "r1",
    status: "ACTIVE",
    paymentProof: null,
    rejectionReason: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    source: null,
    recordedBy: null,
    team,
    member: { id: "u1", fullName: "محمد", phone: null, age: "البدريين", photo: null },
  };
}

const shanaqita = { id: "t1", name: "الشناقطة" };
const sahel = { id: "t2", name: "أهل الساحل" };
const badriyin = { id: "t3", name: "البدريين" };
const teams = [shanaqita, sahel, badriyin];

describe("picking which teams to look at", () => {
  it("starts with nothing picked, which is no filter", () => {
    expect(hasTeamFilter(NOTHING_PICKED)).toBe(false);
  });

  it("holds several teams at once", () => {
    const picked = toggleTeam(toggleTeam(NOTHING_PICKED, shanaqita.id), sahel.id);

    expect(picked.teamIds).toEqual([shanaqita.id, sahel.id]);
  });

  it("drops a team that is picked again", () => {
    const picked = toggleTeam(toggleTeam(NOTHING_PICKED, shanaqita.id), shanaqita.id);

    expect(picked.teamIds).toEqual([]);
    expect(hasTeamFilter(picked)).toBe(false);
  });

  it("holds having no team alongside teams rather than instead of them", () => {
    const picked = toggleNoTeam(toggleTeam(NOTHING_PICKED, shanaqita.id));

    expect(picked.teamIds).toEqual([shanaqita.id]);
    expect(picked.noTeam).toBe(true);
    expect(pickedLabels(picked, teams)).toEqual(["الشناقطة", "بلا فريق"]);
  });
});

describe("filtering the registrants by team", () => {
  it("keeps everybody when nothing is picked", () => {
    expect(inTeam(registration(shanaqita), NOTHING_PICKED)).toBe(true);
    expect(inTeam(registration(null), NOTHING_PICKED)).toBe(true);
  });

  it("keeps only the players of the team picked", () => {
    const picked = toggleTeam(NOTHING_PICKED, shanaqita.id);

    expect(inTeam(registration(shanaqita), picked)).toBe(true);
    expect(inTeam(registration(sahel), picked)).toBe(false);
    expect(inTeam(registration(null), picked)).toBe(false);
  });

  it("shows the union when several teams are picked", () => {
    const picked = toggleTeam(toggleTeam(NOTHING_PICKED, shanaqita.id), sahel.id);

    expect(inTeam(registration(shanaqita), picked)).toBe(true);
    expect(inTeam(registration(sahel), picked)).toBe(true);
    expect(inTeam(registration(badriyin), picked)).toBe(false);
  });

  it("finds the people with no team, on their own or beside a team", () => {
    const alone = toggleNoTeam(NOTHING_PICKED);
    expect(inTeam(registration(null), alone)).toBe(true);
    expect(inTeam(registration(shanaqita), alone)).toBe(false);

    const beside = toggleTeam(alone, shanaqita.id);
    expect(inTeam(registration(null), beside)).toBe(true);
    expect(inTeam(registration(shanaqita), beside)).toBe(true);
    expect(inTeam(registration(sahel), beside)).toBe(false);
  });
});

describe("saying what is picked without opening the control", () => {
  it("says every team when nothing is picked", () => {
    expect(teamFilterSummary(NOTHING_PICKED, teams)).toBe("كل الفرق");
  });

  it("names one and two of them in full", () => {
    const one = toggleTeam(NOTHING_PICKED, shanaqita.id);
    expect(teamFilterSummary(one, teams)).toBe("الشناقطة");

    const two = toggleTeam(one, sahel.id);
    expect(teamFilterSummary(two, teams)).toBe("الشناقطة، أهل الساحل");
  });

  it("counts the rest once there are more than two", () => {
    const three = toggleNoTeam(toggleTeam(toggleTeam(NOTHING_PICKED, shanaqita.id), sahel.id));

    expect(teamFilterSummary(three, teams)).toBe("الشناقطة، أهل الساحل و1 غيرها");
  });

  it("ignores a team the tournament no longer has", () => {
    const picked = toggleTeam(NOTHING_PICKED, "gone");

    expect(teamFilterSummary(picked, teams)).toBe("كل الفرق");
  });
});
