import { describe, it, expect } from "vitest";
import { isQuietHour } from "./quietHours";
import { fromClubWallClock } from "./clubTime";

const at = (hour: number) => fromClubWallClock(Date.UTC(2026, 8, 20, hour, 30));

describe("isQuietHour", () => {
  it("holds the night from ten in the evening", () => {
    expect(isQuietHour(at(22))).toBe(true);
    expect(isQuietHour(at(23))).toBe(true);
  });

  it("holds the small hours until seven", () => {
    expect(isQuietHour(at(0))).toBe(true);
    expect(isQuietHour(at(6))).toBe(true);
  });

  it("lets the day through", () => {
    for (const hour of [7, 9, 12, 17, 21]) expect(isQuietHour(at(hour)), String(hour)).toBe(false);
  });
});
