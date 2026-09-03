import { describe, it, expect } from "vitest";
import { matchingPeople, matchingTeams, teamMatches } from "./teamSearch";

const NAJM = { name: "فريق النجم", players: ["أحمد ولد محمد", "عبد الله ولد بابا"] };
const AMAL = { name: "فريق الأمل", players: ["يعقوب ولد سيدي"] };
const TEAMS = [NAJM, AMAL];

describe("matchingTeams", () => {
  it("returns every team when nothing is typed", () => {
    for (const query of ["", "   "]) expect(matchingTeams(TEAMS, query)).toEqual(TEAMS);
  });

  it("finds a team by its own name", () => {
    expect(matchingTeams(TEAMS, "الأمل")).toEqual([AMAL]);
  });

  it("finds the team holding a player, which is the question an admin asks", () => {
    expect(matchingTeams(TEAMS, "بابا")).toEqual([NAJM]);
    expect(matchingTeams(TEAMS, "يعقوب")).toEqual([AMAL]);
  });

  it("takes every word typed, in any order within one name", () => {
    expect(matchingTeams(TEAMS, "عبد بابا")).toEqual([NAJM]);
    expect(matchingTeams(TEAMS, "بابا عبد")).toEqual([NAJM]);
  });

  it("does not match a team name against a player name word by word", () => {
    expect(matchingTeams(TEAMS, "النجم يعقوب")).toEqual([]);
  });

  it("folds the hamza, the ta marbuta and the alif maqsura", () => {
    const team = { name: "فريق الفتى", players: ["أحمد"] };
    expect(matchingTeams([team], "الفتي")).toEqual([team]);
    expect(matchingTeams([team], "احمد")).toEqual([team]);
    expect(matchingTeams([{ name: "مدرسة", players: [] }], "مدرسه")).toHaveLength(1);
  });

  it("finds nothing when nothing carries the name", () => {
    expect(matchingTeams(TEAMS, "زينب")).toEqual([]);
  });
});

describe("teamMatches", () => {
  it("answers for one team against tokens already split", () => {
    expect(teamMatches(NAJM, ["احمد"])).toBe(true);
    expect(teamMatches(AMAL, ["احمد"])).toBe(false);
  });
});

describe("matchingPeople", () => {
  const people = [{ fullName: "أحمد ولد محمد" }, { fullName: "يعقوب ولد سيدي" }];

  it("keeps everyone when nothing is typed", () => {
    expect(matchingPeople(people, "")).toEqual(people);
  });

  it("folds the same letters as the team search", () => {
    expect(matchingPeople(people, "احمد")).toEqual([people[0]]);
  });
});
