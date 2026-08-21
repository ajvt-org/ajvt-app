import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_CATEGORIES,
  CATEGORY_KEYS,
  OPT_OUT_CATEGORIES,
  isOptOutCategory,
} from "./notificationCategories";

describe("the notification category registry", () => {
  it("names every category once", () => {
    expect(new Set(CATEGORY_KEYS).size).toBe(CATEGORY_KEYS.length);
  });

  it("gives every category an Arabic label", () => {
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(category.label.trim(), category.key).not.toBe("");
      expect(/[؀-ۿ]/.test(category.label), category.key).toBe(true);
    }
  });

  it("keeps the decisions a member asked for out of the opt-out list", () => {
    expect(OPT_OUT_CATEGORIES.map((c) => c.key)).not.toContain("MEMBERSHIP_DECISION");
    expect(OPT_OUT_CATEGORIES.map((c) => c.key)).not.toContain("ACTIVITY_DECISION");
  });

  it("reads a category as opt-out only when it is one", () => {
    expect(isOptOutCategory("QUIZ_ROUND")).toBe(true);
    expect(isOptOutCategory("BROADCAST")).toBe(true);
    expect(isOptOutCategory("MEMBERSHIP_DECISION")).toBe(false);
    expect(isOptOutCategory("ACTIVITY_DECISION")).toBe(false);
  });

  it("reads an unknown key as not opt-out, so a typo silences nothing", () => {
    expect(isOptOutCategory("QUIZ")).toBe(false);
    expect(isOptOutCategory("")).toBe(false);
  });

  it("holds the opt-out list as a subset of the whole", () => {
    expect(OPT_OUT_CATEGORIES.every((c) => CATEGORY_KEYS.includes(c.key))).toBe(true);
    expect(OPT_OUT_CATEGORIES.length).toBeLessThan(NOTIFICATION_CATEGORIES.length);
  });
});
