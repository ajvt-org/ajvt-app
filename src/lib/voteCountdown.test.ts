import { describe, it, expect } from "vitest";
import { countdownLabel } from "./voteCountdown";

const NOW = new Date("2026-05-01T10:00:00.000Z");
const inMinutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("countdownLabel", () => {
  it("counts the minutes while under an hour", () => {
    expect(countdownLabel(inMinutes(45), NOW)).toBe("45 دقيقة");
  });

  it("rounds a part minute up, so it never reads zero while open", () => {
    expect(countdownLabel(new Date(NOW.getTime() + 30_000), NOW)).toBe("1 دقيقة");
  });

  it("counts whole hours once past one", () => {
    expect(countdownLabel(inMinutes(150), NOW)).toBe("2 ساعة");
  });

  it("says nothing once the deadline has passed", () => {
    expect(countdownLabel(inMinutes(-1), NOW)).toBeNull();
  });
});
