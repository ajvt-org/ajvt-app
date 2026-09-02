import { describe, it, expect } from "vitest";
import { touchesOwnerRole, strandsOwnerRole, leavesScope, settableRoles } from "./adminRoleChange";
import { OWNER_ROLE, SUPER_ROLE } from "./adminRoles";
import { SCOPED_ROLE } from "./activityAccess";

describe("touchesOwnerRole", () => {
  it("holds when the owner role is granted", () => {
    expect(touchesOwnerRole(SUPER_ROLE, OWNER_ROLE)).toBe(true);
  });

  it("holds when the owner role is removed", () => {
    expect(touchesOwnerRole(OWNER_ROLE, SUPER_ROLE)).toBe(true);
  });

  it("does not hold between two roles below owner", () => {
    expect(touchesOwnerRole(SUPER_ROLE, "MEMBERS")).toBe(false);
  });
});

describe("strandsOwnerRole", () => {
  it("holds for the last owner", () => {
    expect(strandsOwnerRole(OWNER_ROLE, SUPER_ROLE, 1)).toBe(true);
  });

  it("does not hold while another owner is left", () => {
    expect(strandsOwnerRole(OWNER_ROLE, SUPER_ROLE, 2)).toBe(false);
  });

  it("does not hold when the owner keeps the role", () => {
    expect(strandsOwnerRole(OWNER_ROLE, OWNER_ROLE, 1)).toBe(false);
  });

  it("does not hold when the account was never an owner", () => {
    expect(strandsOwnerRole(SUPER_ROLE, "MEMBERS", 0)).toBe(false);
  });
});

describe("leavesScope", () => {
  it("holds when a scoped account moves to another role", () => {
    expect(leavesScope(SCOPED_ROLE, SUPER_ROLE)).toBe(true);
  });

  it("does not hold for an account that was never scoped", () => {
    expect(leavesScope("MEMBERS", SUPER_ROLE)).toBe(false);
  });
});

describe("settableRoles", () => {
  it("offers the owner role to an owner", () => {
    expect(settableRoles(OWNER_ROLE)).toContain(OWNER_ROLE);
  });

  it("withholds the owner role from a full access admin", () => {
    expect(settableRoles(SUPER_ROLE)).not.toContain(OWNER_ROLE);
  });

  it("withholds the owner role before the viewer role is known", () => {
    expect(settableRoles(null)).not.toContain(OWNER_ROLE);
  });

  it("never offers the scoped role, which is set by picking activities", () => {
    expect(settableRoles(OWNER_ROLE)).not.toContain(SCOPED_ROLE);
  });

  it("offers every other role", () => {
    expect(settableRoles(SUPER_ROLE)).toEqual([SUPER_ROLE, "MEMBERS", "ACTIVITIES", "QUIZ"]);
  });
});
