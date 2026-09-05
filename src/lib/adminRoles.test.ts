import { describe, it, expect } from "vitest";
import { OWNER_ROLE, SUPER_ROLE, outranks } from "./adminRoles";
import { SCOPED_ROLE } from "./activityAccess";

describe("ranking one admin role against another", () => {
  it("puts the owner above a full access admin", () => {
    expect(outranks(OWNER_ROLE, SUPER_ROLE)).toBe(true);
    expect(outranks(SUPER_ROLE, OWNER_ROLE)).toBe(false);
  });

  it("puts a full access admin above a scoped one", () => {
    expect(outranks(SUPER_ROLE, SCOPED_ROLE)).toBe(true);
    expect(outranks(SUPER_ROLE, "QUIZ")).toBe(true);
  });

  it("leaves two scoped roles level with each other", () => {
    expect(outranks(SCOPED_ROLE, "QUIZ")).toBe(false);
    expect(outranks("QUIZ", SCOPED_ROLE)).toBe(false);
  });

  it("never lets a role outrank itself", () => {
    expect(outranks(OWNER_ROLE, OWNER_ROLE)).toBe(false);
    expect(outranks(SUPER_ROLE, SUPER_ROLE)).toBe(false);
  });

  it("treats a missing role as the bottom", () => {
    expect(outranks(SUPER_ROLE, null)).toBe(true);
    expect(outranks(null, SUPER_ROLE)).toBe(false);
    expect(outranks(null, null)).toBe(false);
  });
});
