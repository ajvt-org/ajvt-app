import { describe, it, expect } from "vitest";
import { validateGoals } from "./matchInput";

const goal = { memberId: "m1", count: 1, minute: 10 };

describe("validateGoals", () => {
  it("treats a missing list as no goals, not as an error", () => {
    expect(validateGoals(undefined)).toEqual([]);
  });

  it("accepts an empty list", () => {
    expect(validateGoals([])).toEqual([]);
  });

  it("keeps a well-formed goal", () => {
    expect(validateGoals([goal])).toEqual([{ memberId: "m1", count: 1, minute: 10 }]);
  });

  it("rejects anything that is not a list", () => {
    for (const bad of [null, "goals", 5, {}]) {
      expect(validateGoals(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("requires a member id", () => {
    expect(validateGoals([{ count: 1, minute: 5 }])).toBeNull();
    expect(validateGoals([{ ...goal, memberId: 42 }])).toBeNull();
    expect(validateGoals([null])).toBeNull();
  });

  it("requires a positive whole count", () => {
    for (const count of [0, -1, 1.5, "two"]) {
      expect(validateGoals([{ ...goal, count }]), String(count)).toBeNull();
    }
  });

  it("treats an absent or blank minute as unknown rather than invalid", () => {
    expect(validateGoals([{ memberId: "m1", count: 1 }])).toEqual([
      { memberId: "m1", count: 1, minute: null },
    ]);
    expect(validateGoals([{ ...goal, minute: "" }])).toEqual([
      { memberId: "m1", count: 1, minute: null },
    ]);
    expect(validateGoals([{ ...goal, minute: null }])).toEqual([
      { memberId: "m1", count: 1, minute: null },
    ]);
  });

  it("rejects a minute outside a plausible match", () => {
    for (const minute of [0, -5, 131, 1000, 45.5]) {
      expect(validateGoals([{ ...goal, minute }]), String(minute)).toBeNull();
    }
  });

  it("allows the edges of extra time", () => {
    expect(validateGoals([{ ...goal, minute: 1 }])?.[0].minute).toBe(1);
    expect(validateGoals([{ ...goal, minute: 130 }])?.[0].minute).toBe(130);
  });

  it("accepts numeric strings, the form sends strings", () => {
    expect(validateGoals([{ memberId: "m1", count: "2", minute: "77" }])).toEqual([
      { memberId: "m1", count: 2, minute: 77 },
    ]);
  });

  it("rejects the whole list if one row is bad", () => {
    expect(validateGoals([goal, { ...goal, count: 0 }])).toBeNull();
  });
});
