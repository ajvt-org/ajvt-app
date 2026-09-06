import { describe, it, expect } from "vitest";
import {
  captainFirst,
  holdsViewer,
  isCaptain,
  isViewer,
  viewerTeamFirst,
  viewerTeamId,
} from "./squad";

const squad = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("captainFirst", () => {
  it("lifts the captain out of the middle to the front", () => {
    expect(captainFirst(squad, "b")).toEqual([{ id: "b" }, { id: "a" }, { id: "c" }]);
  });

  it("leaves the order alone when no captain is set", () => {
    expect(captainFirst(squad, null)).toEqual(squad);
  });

  it("leaves the order alone when the captain is not on the squad", () => {
    expect(captainFirst(squad, "z")).toEqual(squad);
  });

  it("keeps a captain who is already first where they are", () => {
    expect(captainFirst(squad, "a")).toEqual(squad);
  });
});

describe("isCaptain", () => {
  it("marks the player the team is led by", () => {
    expect(isCaptain("b", "b")).toBe(true);
    expect(isCaptain("a", "b")).toBe(false);
  });

  it("marks nobody when the team has no captain", () => {
    expect(isCaptain("a", null)).toBe(false);
    expect(isCaptain("", null)).toBe(false);
  });

  it("marks nobody on a player who has no account behind them", () => {
    expect(isCaptain("", "")).toBe(false);
    expect(captainFirst([{ id: "" }, { id: "a" }], "")).toEqual([{ id: "" }, { id: "a" }]);
  });
});

const teams = [
  { id: "t1", members: [{ member: { id: "a" } }, { member: { id: "b" } }] },
  { id: "t2", members: [{ member: { id: "c" } }] },
  { id: "t3", members: [] },
];

describe("isViewer", () => {
  it("marks the player the viewer is signed in as", () => {
    expect(isViewer("b", "b")).toBe(true);
    expect(isViewer("a", "b")).toBe(false);
  });

  it("marks nobody for a viewer who is signed out", () => {
    expect(isViewer("a", null)).toBe(false);
    expect(isViewer("", null)).toBe(false);
  });

  it("marks nobody on a player who has no account behind them", () => {
    expect(isViewer("", "")).toBe(false);
  });
});

describe("holdsViewer", () => {
  it("finds the viewer wherever they sit in the squad", () => {
    expect(holdsViewer(teams[0], "b")).toBe(true);
    expect(holdsViewer(teams[1], "b")).toBe(false);
  });

  it("finds nobody in an empty squad", () => {
    expect(holdsViewer(teams[2], "b")).toBe(false);
  });

  it("finds nobody for a viewer who is signed out", () => {
    expect(holdsViewer(teams[0], null)).toBe(false);
  });
});

describe("viewerTeamFirst", () => {
  it("lifts the team the viewer plays for out of the middle", () => {
    expect(viewerTeamFirst(teams, "c").map((team) => team.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("leaves the order alone for a viewer who is signed out", () => {
    expect(viewerTeamFirst(teams, null)).toEqual(teams);
  });

  it("leaves the order alone for a viewer who plays for none of them", () => {
    expect(viewerTeamFirst(teams, "z")).toEqual(teams);
  });

  it("keeps a viewer whose team is already first where it is", () => {
    expect(viewerTeamFirst(teams, "a")).toEqual(teams);
  });
});

describe("viewerTeamId", () => {
  it("names the team the viewer plays for", () => {
    expect(viewerTeamId(teams, "c")).toBe("t2");
  });

  it("names nobody's team for a viewer who is signed out", () => {
    expect(viewerTeamId(teams, null)).toBeNull();
  });

  it("names nobody's team for a viewer who plays for none of them", () => {
    expect(viewerTeamId(teams, "z")).toBeNull();
  });

  it("finds a squad of one, which is what a singles entrant is", () => {
    expect(viewerTeamId([{ id: "solo", members: [{ member: { id: "x" } }] }], "x")).toBe("solo");
  });
});
