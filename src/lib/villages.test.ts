import { describe, it, expect } from "vitest";
import {
  HOME_VILLAGE,
  OTHER_VILLAGE,
  ageForVillage,
  isKnownVillage,
  isReservedVillageName,
  requiresAgeGroup,
  villageChoices,
} from "./villages";

describe("requiresAgeGroup", () => {
  it("only asks the home village for an age group", () => {
    expect(requiresAgeGroup(HOME_VILLAGE)).toBe(true);
    expect(requiresAgeGroup("أفجار")).toBe(false);
    expect(requiresAgeGroup(OTHER_VILLAGE)).toBe(false);
  });

  it("ignores surrounding spaces", () => {
    expect(requiresAgeGroup(`  ${HOME_VILLAGE} `)).toBe(true);
  });
});

describe("ageForVillage", () => {
  it("keeps the age group for the home village", () => {
    expect(ageForVillage(HOME_VILLAGE, " البدريين ")).toBe("البدريين");
  });

  it("drops the age group everywhere else", () => {
    expect(ageForVillage("أفجار", "البدريين")).toBeNull();
    expect(ageForVillage(OTHER_VILLAGE, "البدريين")).toBeNull();
  });

  it("reads a blank age as no age", () => {
    expect(ageForVillage(HOME_VILLAGE, "   ")).toBeNull();
    expect(ageForVillage(HOME_VILLAGE, null)).toBeNull();
    expect(ageForVillage(HOME_VILLAGE, undefined)).toBeNull();
  });
});

describe("villageChoices", () => {
  it("puts the other option last", () => {
    expect(villageChoices([HOME_VILLAGE, "أفجار"])).toEqual([
      HOME_VILLAGE,
      "أفجار",
      OTHER_VILLAGE,
    ]);
  });

  it("never lists the other option twice", () => {
    expect(villageChoices([HOME_VILLAGE, OTHER_VILLAGE])).toEqual([HOME_VILLAGE, OTHER_VILLAGE]);
  });

  it("offers the other option on its own when nothing is managed yet", () => {
    expect(villageChoices([])).toEqual([OTHER_VILLAGE]);
  });
});

describe("isKnownVillage", () => {
  it("accepts a managed village and the other option", () => {
    expect(isKnownVillage(HOME_VILLAGE, [HOME_VILLAGE])).toBe(true);
    expect(isKnownVillage(OTHER_VILLAGE, [HOME_VILLAGE])).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isKnownVillage("أفجار", [HOME_VILLAGE])).toBe(false);
    expect(isKnownVillage("", [HOME_VILLAGE])).toBe(false);
  });
});

describe("isReservedVillageName", () => {
  it("keeps the other option out of the managed list", () => {
    expect(isReservedVillageName(OTHER_VILLAGE)).toBe(true);
    expect(isReservedVillageName(` ${OTHER_VILLAGE}`)).toBe(true);
    expect(isReservedVillageName("أفجار")).toBe(false);
  });
});
