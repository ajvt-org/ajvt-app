import { describe, it, expect } from "vitest";
import { toLocalInput, fromLocalInput, isPresetPeriod, CUSTOM_PERIOD } from "./competitionTypes";

const local = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

describe("the start field on the competition form", () => {
  it("shows a moment as the wall clock time of whoever is reading it", () => {
    expect(toLocalInput("2026-08-20T08:30:00.000Z")).toBe(local("2026-08-20T08:30:00.000Z"));
  });

  it("reads a wall clock time back as the moment it names", () => {
    const iso = fromLocalInput(local("2026-08-20T08:30:00.000Z"));

    expect(iso).toBe("2026-08-20T08:30:00.000Z");
  });

  it("round trips", () => {
    for (const iso of ["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:00.000Z"]) {
      expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    }
  });

  it("shows nothing for a value it cannot read", () => {
    expect(toLocalInput("")).toBe("");
    expect(toLocalInput("nonsense")).toBe("");
    expect(fromLocalInput("")).toBe("");
  });
});

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
