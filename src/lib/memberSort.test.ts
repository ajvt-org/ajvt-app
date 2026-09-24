import { describe, it, expect } from "vitest";
import { DEFAULT_MEMBER_SORT, MEMBER_SORTS, readMemberSort, sortMembers } from "./memberSort";

const named = (...names: string[]) => names.map((fullName, id) => ({ id, fullName }));
const names = (rows: { fullName: string }[]) => rows.map((row) => row.fullName);

describe("reading the order from the address", () => {
  it("names the three orders", () => {
    expect([...MEMBER_SORTS]).toEqual(["review", "az", "za"]);
  });

  it("reads each order it knows", () => {
    for (const sort of MEMBER_SORTS) expect(readMemberSort(sort)).toBe(sort);
  });

  it("falls back to the review order for anything else", () => {
    for (const raw of [null, "", "name", "AZ", "newest"]) {
      expect(readMemberSort(raw), String(raw)).toBe(DEFAULT_MEMBER_SORT);
    }
    expect(DEFAULT_MEMBER_SORT).toBe("review");
  });
});

describe("ordering members by name", () => {
  const list = named("عمر", "احمد", "إبراهيم", "أحمد", "زينب", "باب", "آمنة");

  it("keeps the order the list arrived in by default", () => {
    expect(sortMembers(list, "review")).toBe(list);
  });

  it("orders by the letter, not by the hamza carrier", () => {
    expect(names(sortMembers(list, "az"))).toEqual([
      "آمنة",
      "إبراهيم",
      "أحمد",
      "احمد",
      "باب",
      "زينب",
      "عمر",
    ]);
  });

  it("orders the other way round", () => {
    expect(names(sortMembers(list, "za"))).toEqual([
      "عمر",
      "زينب",
      "باب",
      "احمد",
      "أحمد",
      "إبراهيم",
      "آمنة",
    ]);
  });

  it("keeps two people of one name in the order they arrived, either way", () => {
    const twins = named("محمد", "أحمد", "محمد");
    expect(sortMembers(twins, "az").map((row) => row.id)).toEqual([1, 0, 2]);
    expect(sortMembers(twins, "za").map((row) => row.id)).toEqual([0, 2, 1]);
  });

  it("leaves the list it was given untouched", () => {
    const before = names(list);
    sortMembers(list, "az");
    expect(names(list)).toEqual(before);
  });
});
