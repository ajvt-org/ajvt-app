import { describe, it, expect } from "vitest";
import { willBeLinked } from "./linkedDonor";

describe("whether a donation names an account once the change lands", () => {
  it("is true when the body links one", () => {
    expect(willBeLinked(null, "u1")).toBe(true);
  });

  it("is false when the body unlinks", () => {
    expect(willBeLinked("u1", null)).toBe(false);
  });

  it("follows the record when the body says nothing about the account", () => {
    expect(willBeLinked("u1", undefined)).toBe(true);
    expect(willBeLinked(null, undefined)).toBe(false);
  });
});
