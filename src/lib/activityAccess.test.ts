import { describe, it, expect } from "vitest";
import { allowsActivity, isScopedRole, seesEveryActivity, SCOPED_ROLE } from "@/lib/activityAccess";

describe("seesEveryActivity", () => {
  it("lets the full and the activities admin through", () => {
    expect(seesEveryActivity("SUPER")).toBe(true);
    expect(seesEveryActivity("ACTIVITIES")).toBe(true);
  });

  it("does not let a scoped admin see everything", () => {
    expect(seesEveryActivity(SCOPED_ROLE)).toBe(false);
  });
});

describe("allowsActivity", () => {
  it("lets an unscoped admin at any activity, attached or not", () => {
    expect(allowsActivity("SUPER", false)).toBe(true);
    expect(allowsActivity("ACTIVITIES", false)).toBe(true);
  });

  it("lets a scoped admin only at an activity they are attached to", () => {
    expect(allowsActivity(SCOPED_ROLE, true)).toBe(true);
    expect(allowsActivity(SCOPED_ROLE, false)).toBe(false);
  });

  it("refuses a role it has never heard of, attached or not", () => {
    expect(allowsActivity("MEMBERS", true)).toBe(false);
    expect(allowsActivity("QUIZ", true)).toBe(false);
    expect(allowsActivity("", true)).toBe(false);
    expect(allowsActivity("SUPERUSER", true)).toBe(false);
  });
});

describe("isScopedRole", () => {
  it("knows the scoped role from the rest", () => {
    expect(isScopedRole(SCOPED_ROLE)).toBe(true);
    expect(isScopedRole("SUPER")).toBe(false);
    expect(isScopedRole("ACTIVITIES")).toBe(false);
  });
});
