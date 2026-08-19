import { describe, it, expect } from "vitest";
import { toLocalInput, fromLocalInput } from "./competitionTypes";

describe("the start field on the competition form", () => {
  it("shows a moment as a value the input accepts", () => {
    expect(toLocalInput("2026-08-20T08:30:00.000Z")).toBe("2026-08-20T08:30");
  });

  it("reads it back as a moment", () => {
    expect(fromLocalInput("2026-08-20T08:30")).toBe("2026-08-20T08:30:00.000Z");
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
