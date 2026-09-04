import { describe, it, expect } from "vitest";
import { cleanProofNames, leadProof, proofsToAdd, proofsToRemove } from "./expenseProofs";

describe("the list of justificatifs an expense is given", () => {
  it("drops blanks and keeps the order they were added in", () => {
    expect(cleanProofNames(["b.webp", "", null, "  ", "a.webp"])).toEqual(["b.webp", "a.webp"]);
  });

  it("keeps one row when the same file is handed in twice", () => {
    expect(cleanProofNames(["a.webp", "a.webp"])).toEqual(["a.webp"]);
  });

  it("trims what it is given", () => {
    expect(cleanProofNames(["  a.webp  "])).toEqual(["a.webp"]);
  });
});

describe("working out what to write", () => {
  it("adds only what is not already there", () => {
    expect(proofsToAdd(["a"], ["a", "b"])).toEqual(["b"]);
  });

  it("removes only what has gone", () => {
    expect(proofsToRemove(["a", "b"], ["a"])).toEqual(["b"]);
  });

  it("changes nothing when the list is the same", () => {
    expect(proofsToAdd(["a", "b"], ["a", "b"])).toEqual([]);
    expect(proofsToRemove(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("removes every one when the list is emptied", () => {
    expect(proofsToRemove(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("adds a second file without disturbing the first", () => {
    expect(proofsToAdd(["a"], ["a", "b", "c"])).toEqual(["b", "c"]);
    expect(proofsToRemove(["a"], ["a", "b", "c"])).toEqual([]);
  });
});

describe("the one the old column keeps", () => {
  it("is the first of the list", () => {
    expect(leadProof(["a", "b"])).toBe("a");
  });

  it("is nothing when there are none", () => {
    expect(leadProof([])).toBeNull();
  });
});
