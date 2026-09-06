import { describe, it, expect } from "vitest";
import { PERSON_STEP, isPersonStep, stepHref } from "./steps";

describe("sign up steps", () => {
  it("reads the person step out of the url", () => {
    expect(isPersonStep(PERSON_STEP)).toBe(true);
  });

  it("treats anything else as the first step", () => {
    expect(isPersonStep(null)).toBe(false);
    expect(isPersonStep("")).toBe(false);
    expect(isPersonStep("nonsense")).toBe(false);
  });

  it("addresses the first step as the bare form", () => {
    expect(stepHref(null, null)).toBe("/register");
  });

  it("addresses the person step", () => {
    expect(stepHref(PERSON_STEP, null)).toBe("/register?step=person");
  });

  it("carries the screen that opened the form through both steps", () => {
    expect(stepHref(null, "/login")).toBe("/register?from=%2Flogin");
    expect(stepHref(PERSON_STEP, "/login")).toBe("/register?step=person&from=%2Flogin");
  });
});
