import { describe, it, expect } from "vitest";
import {
  destinationKind,
  destinationOf,
  destinationTitle,
  destinationValue,
  hasTwoDestinations,
  optionsOfKind,
  type DestinationOption,
} from "./moneyDestination";

const OPTIONS: DestinationOption[] = [
  { id: "a1", title: "بطولة الصيف", kind: "activity" },
  { id: "c1", title: "مسابقة رمضان", kind: "competition" },
];

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

describe("choosing a destination in the one picker", () => {
  it("turns an activity choice into an activity and nothing else", () => {
    expect(destinationOf(OPTIONS, "a1")).toEqual({ activityId: "a1", competitionId: null });
  });

  it("turns a quiz choice into a competition and nothing else", () => {
    expect(destinationOf(OPTIONS, "c1")).toEqual({ activityId: null, competitionId: "c1" });
  });

  it("turns the empty choice into no destination at all", () => {
    expect(destinationOf(OPTIONS, "")).toEqual({ activityId: null, competitionId: null });
  });

  it("refuses to guess at an id it does not know", () => {
    expect(destinationOf(OPTIONS, "gone")).toEqual({ activityId: null, competitionId: null });
  });

  it("reads back the value a record already carries", () => {
    expect(destinationValue({ activityId: "a1", competitionId: null })).toBe("a1");
    expect(destinationValue({ activityId: null, competitionId: "c1" })).toBe("c1");
    expect(destinationValue({})).toBe("");
  });

  it("names whichever kind the id belongs to", () => {
    expect(destinationTitle(OPTIONS, "c1")).toBe("مسابقة رمضان");
    expect(destinationTitle(OPTIONS, "a1")).toBe("بطولة الصيف");
    expect(destinationTitle(OPTIONS, "gone")).toBeNull();
  });

  it("keeps the two kinds in separate groups", () => {
    expect(optionsOfKind(OPTIONS, "activity").map((o) => o.id)).toEqual(["a1"]);
    expect(optionsOfKind(OPTIONS, "competition").map((o) => o.id)).toEqual(["c1"]);
  });
});
