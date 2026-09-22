import { describe, it, expect } from "vitest";
import { seededShuffle } from "./seededShuffle";

const items = ["أ", "ب", "ج", "د", "ه", "و", "ز", "ح"];

describe("seededShuffle", () => {
  it("gives the same order every time for the same seed", () => {
    expect(seededShuffle(items, "election:member")).toEqual(
      seededShuffle(items, "election:member"),
    );
  });

  it("gives a different order for a different seed", () => {
    expect(seededShuffle(items, "election:one")).not.toEqual(seededShuffle(items, "election:two"));
  });

  it("hands back the same items, none lost and none invented", () => {
    const out = seededShuffle(items, "election:member");

    expect(out).toHaveLength(items.length);
    expect([...out].sort()).toEqual([...items].sort());
  });

  it("leaves the list it was given alone", () => {
    const given = [...items];

    seededShuffle(given, "election:member");

    expect(given).toEqual(items);
  });

  it("answers an empty list with an empty list", () => {
    expect(seededShuffle([], "anything")).toEqual([]);
  });

  it("answers a single item with itself", () => {
    expect(seededShuffle(["واحد"], "anything")).toEqual(["واحد"]);
  });

  it("takes an empty seed rather than throwing", () => {
    expect([...seededShuffle(items, "")].sort()).toEqual([...items].sort());
  });
});
