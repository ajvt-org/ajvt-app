import { describe, it, expect } from "vitest";
import { destinationKind, hasTwoDestinations } from "./moneyDestination";

describe("where a payment or an expense is aimed", () => {
  it("is the activity when one is named", () => {
    expect(destinationKind({ activityId: "a1", competitionId: null })).toBe("activity");
  });

  it("is the competition when one is named", () => {
    expect(destinationKind({ activityId: null, competitionId: "c1" })).toBe("competition");
  });

  it("is the association itself when neither is named", () => {
    expect(destinationKind({ activityId: null, competitionId: null })).toBe("general");
    expect(destinationKind({})).toBe("general");
    expect(destinationKind({ activityId: "", competitionId: "" })).toBe("general");
  });
});

describe("the one destination rule", () => {
  it("catches a record aimed at an activity and a competition at once", () => {
    expect(hasTwoDestinations({ activityId: "a1", competitionId: "c1" })).toBe(true);
  });

  it("passes a record aimed at one of them", () => {
    expect(hasTwoDestinations({ activityId: "a1", competitionId: null })).toBe(false);
    expect(hasTwoDestinations({ activityId: null, competitionId: "c1" })).toBe(false);
  });

  it("passes a record aimed at neither", () => {
    expect(hasTwoDestinations({})).toBe(false);
    expect(hasTwoDestinations({ activityId: null, competitionId: null })).toBe(false);
    expect(hasTwoDestinations({ activityId: "", competitionId: "c1" })).toBe(false);
  });
});
