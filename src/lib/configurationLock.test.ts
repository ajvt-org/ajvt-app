import { describe, it, expect } from "vitest";
import { lockOf } from "./configurationLock";

const NOW = new Date("2026-09-08T12:00:00Z");
const BEFORE = new Date("2026-09-07T12:00:00Z");
const AFTER = new Date("2026-09-09T12:00:00Z");

describe("what closes a configuration", () => {
  it("leaves it open while nothing has started and nothing is recorded", () => {
    expect(lockOf(null, false, NOW)).toBeNull();
    expect(lockOf(AFTER, false, NOW)).toBeNull();
  });

  it("closes it once the tournament has started", () => {
    expect(lockOf(BEFORE, false, NOW)).toBe("STARTED");
  });

  it("closes it on a recorded unit even where there is no date", () => {
    expect(lockOf(null, true, NOW)).toBe("RECORDED");
  });

  it("closes it on a recorded unit even where the date is still ahead", () => {
    expect(lockOf(AFTER, true, NOW)).toBe("RECORDED");
  });

  it("names the result rather than the date when both are in the way", () => {
    expect(lockOf(BEFORE, true, NOW)).toBe("RECORDED");
  });

  it("closes it the moment the start is reached", () => {
    expect(lockOf(NOW, false, NOW)).toBe("STARTED");
  });
});
