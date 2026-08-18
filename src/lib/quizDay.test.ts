import { describe, it, expect } from "vitest";
import {
  competitionDay,
  dayState,
  isOpen,
  weekOf,
  drawQuestions,
  seededShuffle,
  stampOf,
  minutesOf,
} from "./quizDay";

const window = { publishMinutes: 8 * 60, cutoffMinutes: 22 * 60 };
const at = (iso: string) => new Date(iso);

describe("competitionDay", () => {
  it("finds today's place in the run", () => {
    expect(competitionDay("2026-08-20", 30, at("2026-08-20T10:00:00Z"))).toEqual({
      day: "2026-08-20",
      index: 0,
    });
    expect(competitionDay("2026-08-20", 30, at("2026-08-25T10:00:00Z"))?.index).toBe(5);
  });

  it("is nothing before the run starts", () => {
    expect(competitionDay("2026-08-20", 30, at("2026-08-19T23:59:00Z"))).toBeNull();
  });

  it("is nothing after the last day", () => {
    expect(competitionDay("2026-08-20", 30, at("2026-09-19T00:00:00Z"))).toBeNull();
  });

  it("counts the last day as inside the run", () => {
    expect(competitionDay("2026-08-20", 30, at("2026-09-18T10:00:00Z"))?.index).toBe(29);
  });
});

describe("dayState", () => {
  it("is closed before the day opens", () => {
    expect(dayState("2026-08-20", 30, window, at("2026-08-20T07:59:00Z"))).toBe("before");
  });

  it("opens at the publication time", () => {
    expect(dayState("2026-08-20", 30, window, at("2026-08-20T08:00:00Z"))).toBe("open");
  });

  it("stays open right up to the cutoff", () => {
    expect(dayState("2026-08-20", 30, window, at("2026-08-20T21:59:00Z"))).toBe("open");
  });

  it("closes at the cutoff", () => {
    expect(dayState("2026-08-20", 30, window, at("2026-08-20T22:00:00Z"))).toBe("closed");
  });

  it("is outside the competition on a day that is not part of it", () => {
    expect(dayState("2026-08-20", 30, window, at("2026-08-19T10:00:00Z"))).toBe("outside");
  });

  it("answers the same question through isOpen", () => {
    expect(isOpen("2026-08-20", 30, window, at("2026-08-20T12:00:00Z"))).toBe(true);
    expect(isOpen("2026-08-20", 30, window, at("2026-08-20T23:00:00Z"))).toBe(false);
  });
});

describe("weekOf", () => {
  it("puts the first seven days in week zero", () => {
    expect(weekOf("2026-08-20", "2026-08-20")).toBe(0);
    expect(weekOf("2026-08-20", "2026-08-26")).toBe(0);
  });

  it("starts week one on the eighth day", () => {
    expect(weekOf("2026-08-20", "2026-08-27")).toBe(1);
  });

  it("refuses a day before the run", () => {
    expect(weekOf("2026-08-20", "2026-08-19")).toBe(-1);
  });
});

describe("drawQuestions", () => {
  const pool = Array.from({ length: 40 }, (_, i) => `q${i}`);

  it("draws the number asked for", () => {
    expect(drawQuestions(pool, 10, "user-1")).toHaveLength(10);
  });

  it("never repeats a question inside one draw", () => {
    const drawn = drawQuestions(pool, 10, "user-1");
    expect(new Set(drawn).size).toBe(10);
  });

  it("gives the same member the same draw every time", () => {
    expect(drawQuestions(pool, 10, "user-1")).toEqual(drawQuestions(pool, 10, "user-1"));
  });

  it("gives different members different draws", () => {
    const a = drawQuestions(pool, 10, "user-1");
    const b = drawQuestions(pool, 10, "user-2");
    expect(a).not.toEqual(b);
  });

  it("does not depend on the order the pool arrives in", () => {
    const reversed = [...pool].reverse();
    expect(drawQuestions(pool, 10, "user-1")).toEqual(drawQuestions(reversed, 10, "user-1"));
  });

  it("gives everything it has when the pool is smaller than asked", () => {
    const small = ["a", "b", "c"];
    expect(drawQuestions(small, 10, "user-1").sort()).toEqual(["a", "b", "c"]);
  });

  it("draws nothing from an empty pool", () => {
    expect(drawQuestions([], 10, "user-1")).toEqual([]);
  });

  it("spreads across the pool rather than always taking the front", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) drawQuestions(pool, 10, `user-${i}`).forEach((q) => seen.add(q));
    expect(seen.size).toBeGreaterThan(30);
  });
});

describe("seededShuffle", () => {
  const ids = ["a", "b", "c", "d"];

  it("keeps every option", () => {
    expect([...seededShuffle(ids, "seed-1")].sort()).toEqual(ids);
  });

  it("gives the same attempt the same order every time", () => {
    expect(seededShuffle(ids, "seed-1")).toEqual(seededShuffle(ids, "seed-1"));
  });

  it("gives different attempts different orders", () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, i) => seededShuffle(ids, `seed-${i}`).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("copes with a single option", () => {
    expect(seededShuffle(["only"], "seed")).toEqual(["only"]);
  });
});

describe("stampOf and minutesOf", () => {
  it("reads the day and the minute in UTC", () => {
    expect(stampOf(at("2026-08-20T22:30:00Z"))).toBe("2026-08-20");
    expect(minutesOf(at("2026-08-20T22:30:00Z"))).toBe(1350);
  });
});
