import { describe, it, expect } from "vitest";
import { isPresetPeriod, CUSTOM_PERIOD } from "./competitionTypes";

describe("how often a round comes round", () => {
  it("knows the choices the form offers", () => {
    expect(isPresetPeriod(60)).toBe(true);
    expect(isPresetPeriod(1440)).toBe(true);
  });

  it("treats anything else as a length the admin typed", () => {
    expect(isPresetPeriod(45)).toBe(false);
    expect(isPresetPeriod(CUSTOM_PERIOD)).toBe(false);
  });
});
