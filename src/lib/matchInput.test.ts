import { describe, it, expect } from "vitest";
import {
  validateGoals,
  validateGoalEvents,
  validateKicks,
  scoreFromGoals,
  shootoutFromKicks,
  parseScorePair,
} from "./matchInput";

const goal = { userId: "m1", count: 1, minute: 10 };

describe("validateGoals", () => {
  it("treats a missing list as no goals, not as an error", () => {
    expect(validateGoals(undefined)).toEqual([]);
  });

  it("accepts an empty list", () => {
    expect(validateGoals([])).toEqual([]);
  });

  it("keeps a well-formed goal", () => {
    expect(validateGoals([goal])).toEqual([{ userId: "m1", count: 1, minute: 10 }]);
  });

  it("rejects anything that is not a list", () => {
    for (const bad of [null, "goals", 5, {}]) {
      expect(validateGoals(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("requires a member id", () => {
    expect(validateGoals([{ count: 1, minute: 5 }])).toBeNull();
    expect(validateGoals([{ ...goal, userId: 42 }])).toBeNull();
    expect(validateGoals([null])).toBeNull();
  });

  it("requires a positive whole count", () => {
    for (const count of [0, -1, 1.5, "two"]) {
      expect(validateGoals([{ ...goal, count }]), String(count)).toBeNull();
    }
  });

  it("treats an absent or blank minute as unknown rather than invalid", () => {
    expect(validateGoals([{ userId: "m1", count: 1 }])).toEqual([
      { userId: "m1", count: 1, minute: null },
    ]);
    expect(validateGoals([{ ...goal, minute: "" }])).toEqual([
      { userId: "m1", count: 1, minute: null },
    ]);
    expect(validateGoals([{ ...goal, minute: null }])).toEqual([
      { userId: "m1", count: 1, minute: null },
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
    expect(validateGoals([{ userId: "m1", count: "2", minute: "77" }])).toEqual([
      { userId: "m1", count: 2, minute: 77 },
    ]);
  });

  it("rejects the whole list if one row is bad", () => {
    expect(validateGoals([goal, { ...goal, count: 0 }])).toBeNull();
  });
});

describe("parseScorePair", () => {
  it("reads a plain score", () => {
    expect(parseScorePair(2, 1)).toEqual({ home: 2, away: 1 });
  });

  it("reads a goalless draw", () => {
    expect(parseScorePair(0, 0)).toEqual({ home: 0, away: 0 });
  });

  it("reads what a number input actually sends", () => {
    expect(parseScorePair("2", "1")).toEqual({ home: 2, away: 1 });
  });

  it("clears the score when both sides are null", () => {
    expect(parseScorePair(null, null)).toBeNull();
  });

  it("reads a lone null as zero, which is what the form sends", () => {
    expect(parseScorePair(null, 3)).toEqual({ home: 0, away: 3 });
  });

  it("rejects a score given for one side only", () => {
    expect(parseScorePair(3, undefined)).toBe("invalid");
  });

  it("rejects a negative score", () => {
    expect(parseScorePair(-1, 0)).toBe("invalid");
  });

  it("rejects a fractional score", () => {
    expect(parseScorePair(1.5, 0)).toBe("invalid");
  });

  it("rejects something that is not a number", () => {
    expect(parseScorePair("two", 0)).toBe("invalid");
  });
});

describe("validateGoalEvents", () => {
  const H = "home";
  const A = "away";

  it("fills the defaults for a plain goal", () => {
    const events = validateGoalEvents([{ teamId: H, userId: "m1" }], H, A);

    expect(events).toEqual([
      { teamId: H, userId: "m1", kind: "GOAL", period: "REGULAR", minute: null },
    ]);
  });

  it("accepts an unknown scorer", () => {
    const events = validateGoalEvents([{ teamId: A, userId: null, kind: "PENALTY" }], H, A);

    expect(events![0].userId).toBeNull();
    expect(events![0].kind).toBe("PENALTY");
  });

  it("rejects a goal for a team not in the match", () => {
    expect(validateGoalEvents([{ teamId: "zzz", userId: null }], H, A)).toBeNull();
  });

  it("rejects a bad kind, period or minute", () => {
    expect(validateGoalEvents([{ teamId: H, userId: null, kind: "X" }], H, A)).toBeNull();
    expect(validateGoalEvents([{ teamId: H, userId: null, period: "X" }], H, A)).toBeNull();
    expect(validateGoalEvents([{ teamId: H, userId: null, minute: 300 }], H, A)).toBeNull();
  });
});

describe("scoreFromGoals and shootoutFromKicks", () => {
  it("derives the score from the credited teams", () => {
    expect(scoreFromGoals([{ teamId: "h" }, { teamId: "h" }, { teamId: "a" }], "h")).toEqual({
      home: 2,
      away: 1,
    });
  });

  it("counts only the scored kicks", () => {
    const kicks = [
      { teamId: "h", userId: null, scored: true },
      { teamId: "a", userId: null, scored: false },
      { teamId: "h", userId: null, scored: false },
      { teamId: "a", userId: null, scored: true },
      { teamId: "h", userId: null, scored: true },
    ];

    expect(shootoutFromKicks(kicks, "h")).toEqual({ home: 2, away: 1 });
  });
});

describe("validateKicks", () => {
  it("reads absence as an empty shootout", () => {
    expect(validateKicks(undefined, "h", "a")).toEqual([]);
  });

  it("rejects a kick without a verdict", () => {
    expect(validateKicks([{ teamId: "h", userId: null }], "h", "a")).toBeNull();
  });
});
