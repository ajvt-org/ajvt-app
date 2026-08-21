import { describe, it, expect } from "vitest";
import { daysWaiting, isOverdue, longestFirst, WAITING_DAYS } from "./waitingRequests";

const NOW = new Date("2026-08-21T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
const row = (name: string, days: number) => ({
  id: name,
  userId: null,
  name,
  since: ago(days).toISOString(),
  days,
});

describe("daysWaiting", () => {
  it("counts whole days only, so a few hours is not a day", () => {
    expect(daysWaiting(new Date(NOW.getTime() - 20 * 3600_000), NOW)).toBe(0);
  });

  it("counts a week as seven", () => {
    expect(daysWaiting(ago(7), NOW)).toBe(7);
  });

  it("is nothing for a request made this instant", () => {
    expect(daysWaiting(NOW, NOW)).toBe(0);
  });
});

describe("isOverdue", () => {
  it("holds a request that has waited the full delay", () => {
    expect(isOverdue(ago(WAITING_DAYS), NOW)).toBe(true);
  });

  it("leaves one that has waited a day less", () => {
    expect(isOverdue(ago(WAITING_DAYS - 1), NOW)).toBe(false);
  });

  it("takes a delay of its own", () => {
    expect(isOverdue(ago(3), NOW, 2)).toBe(true);
    expect(isOverdue(ago(3), NOW, 21)).toBe(false);
  });
});

describe("longestFirst", () => {
  it("puts whoever has waited longest at the top", () => {
    expect(longestFirst([row("قريب", 2), row("بعيد", 30)]).map((r) => r.name)).toEqual([
      "بعيد",
      "قريب",
    ]);
  });

  it("settles a tie by name so the list does not shuffle between reads", () => {
    expect(longestFirst([row("ب", 5), row("أ", 5)]).map((r) => r.name)).toEqual(["أ", "ب"]);
  });

  it("leaves the caller's array alone", () => {
    const rows = [row("ا", 1), row("ب", 9)];
    longestFirst(rows);
    expect(rows.map((r) => r.name)).toEqual(["ا", "ب"]);
  });

  it("answers nothing for an empty desk", () => {
    expect(longestFirst([])).toEqual([]);
  });
});
