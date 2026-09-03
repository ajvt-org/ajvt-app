import { describe, it, expect } from "vitest";
import { captainFirst, isCaptain } from "./squad";

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
