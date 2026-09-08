import { describe, it, expect } from "vitest";
import { sortTeamPlaces, teamsLeftEmpty, type TeamPlace } from "./teamPlaces";

function place(over: Partial<TeamPlace> = {}): TeamPlace {
  return { id: "p1", userId: "u1", teamId: "t1", captain: false, appeared: false, ...over };
}

describe("sorting the places a repair has found", () => {
  it("takes a plain place and leaves nothing behind", () => {
    const sorted = sortTeamPlaces([place()]);

    expect(sorted.remove).toHaveLength(1);
    expect(sorted.captains).toEqual([]);
    expect(sorted.appeared).toEqual([]);
  });

  it("leaves a captain where they are", () => {
    const sorted = sortTeamPlaces([place({ captain: true })]);

    expect(sorted.remove).toEqual([]);
    expect(sorted.captains).toHaveLength(1);
  });

  it("leaves somebody who has already played", () => {
    const sorted = sortTeamPlaces([place({ appeared: true })]);

    expect(sorted.remove).toEqual([]);
    expect(sorted.appeared).toHaveLength(1);
  });

  it("counts a captain who has also played once, as a captain", () => {
    const sorted = sortTeamPlaces([place({ captain: true, appeared: true })]);

    expect(sorted.captains).toHaveLength(1);
    expect(sorted.appeared).toEqual([]);
    expect(sorted.remove).toEqual([]);
  });

  it("has nothing to sort when nothing was found", () => {
    expect(sortTeamPlaces([])).toEqual({ remove: [], captains: [], appeared: [] });
  });
});

describe("the teams a removal would empty", () => {
  it("names a team whose only place is going", () => {
    expect(teamsLeftEmpty([place()], new Map([["t1", 1]]))).toEqual(["t1"]);
  });

  it("says nothing about a team keeping somebody", () => {
    expect(teamsLeftEmpty([place()], new Map([["t1", 4]]))).toEqual([]);
  });

  it("counts every place going from the same team", () => {
    const going = [place({ id: "a" }), place({ id: "b", userId: "u2" })];

    expect(teamsLeftEmpty(going, new Map([["t1", 2]]))).toEqual(["t1"]);
  });
});
