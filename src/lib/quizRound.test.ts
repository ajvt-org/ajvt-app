import { describe, it, expect } from "vitest";
import {
  roundWindows,
  windowAt,
  currentRound,
  nextWindow,
  roundState,
  endsAt,
  groupOf,
  groupCount,
} from "./quizRound";

const at = (iso: string) => new Date(iso);

const hourly = {
  startsAt: at("2026-08-20T08:00:00Z"),
  roundCount: 20,
  roundPeriodMinutes: 60,
  roundWindowMinutes: 60,
};

const daily = {
  startsAt: at("2026-08-20T08:00:00Z"),
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
};

describe("roundWindows", () => {
  it("lays out one window per round", () => {
    expect(roundWindows(hourly)).toHaveLength(20);
  });

  it("spaces them by the period", () => {
    const [first, second] = roundWindows(hourly);
    expect(second.opensAt.getTime() - first.opensAt.getTime()).toBe(60 * 60_000);
  });

  it("closes a window after its own length rather than at the next round", () => {
    const [first] = roundWindows(daily);
    expect(first.closesAt.toISOString()).toBe("2026-08-20T22:00:00.000Z");
  });

  it("never lets a window outlast its period", () => {
    const greedy = { ...hourly, roundWindowMinutes: 600 };
    const [first, second] = roundWindows(greedy);
    expect(first.closesAt.getTime()).toBeLessThanOrEqual(second.opensAt.getTime());
  });

  it("lays out nothing for a run of no rounds", () => {
    expect(roundWindows({ ...hourly, roundCount: 0 })).toEqual([]);
  });
});

describe("windowAt", () => {
  it("finds a round by its number", () => {
    expect(windowAt(hourly, 3)?.opensAt.toISOString()).toBe("2026-08-20T11:00:00.000Z");
  });

  it("refuses a round outside the run", () => {
    expect(windowAt(hourly, -1)).toBeNull();
    expect(windowAt(hourly, 20)).toBeNull();
  });

  it("refuses a round that is not a whole number", () => {
    expect(windowAt(hourly, 1.5)).toBeNull();
  });
});

describe("currentRound", () => {
  it("is nothing before the first round opens", () => {
    expect(currentRound(hourly, at("2026-08-20T07:59:00Z"))).toBeNull();
  });

  it("opens exactly on time", () => {
    expect(currentRound(hourly, at("2026-08-20T08:00:00Z"))?.index).toBe(0);
  });

  it("moves to the next round as the period turns", () => {
    expect(currentRound(hourly, at("2026-08-20T08:59:59Z"))?.index).toBe(0);
    expect(currentRound(hourly, at("2026-08-20T09:00:00Z"))?.index).toBe(1);
  });

  it("is nothing in the gap between a closed window and the next round", () => {
    expect(currentRound(daily, at("2026-08-20T23:00:00Z"))).toBeNull();
    expect(currentRound(daily, at("2026-08-21T08:00:00Z"))?.index).toBe(1);
  });

  it("is nothing once the run is finished", () => {
    expect(currentRound(hourly, at("2026-08-21T10:00:00Z"))).toBeNull();
  });

  it("counts a daily run in days", () => {
    expect(currentRound(daily, at("2026-08-27T12:00:00Z"))?.index).toBe(7);
  });
});

describe("roundState", () => {
  it("waits before the run starts", () => {
    expect(roundState(hourly, at("2026-08-20T07:00:00Z"))).toBe("before");
  });

  it("is open inside a window", () => {
    expect(roundState(hourly, at("2026-08-20T08:30:00Z"))).toBe("open");
  });

  it("is closed between windows", () => {
    expect(roundState(daily, at("2026-08-20T23:00:00Z"))).toBe("closed");
  });

  it("is over once the last window shuts", () => {
    expect(roundState(hourly, at("2026-08-21T05:00:00Z"))).toBe("over");
  });

  it("is over as soon as the last window shuts, not when its period runs out", () => {
    expect(roundState(daily, at("2026-09-18T23:00:00Z"))).toBe("over");
    expect(roundState(daily, at("2026-09-18T21:00:00Z"))).toBe("open");
  });
});

describe("nextWindow", () => {
  it("is the first round before the run starts", () => {
    expect(nextWindow(daily, at("2026-08-20T07:00:00Z"))?.index).toBe(0);
  });

  it("is the coming round between windows", () => {
    const coming = nextWindow(daily, at("2026-08-20T23:00:00Z"));

    expect(coming?.index).toBe(1);
    expect(coming?.opensAt.toISOString()).toBe("2026-08-21T08:00:00.000Z");
  });

  it("is the following round while one is open", () => {
    expect(nextWindow(daily, at("2026-08-20T09:00:00Z"))?.index).toBe(1);
  });

  it("is nothing after the last round", () => {
    expect(nextWindow(daily, at("2026-09-18T23:00:00Z"))).toBeNull();
  });
});

describe("endsAt", () => {
  it("is when the last window closes", () => {
    expect(endsAt(hourly).toISOString()).toBe("2026-08-21T04:00:00.000Z");
  });

  it("is the start for a run of no rounds", () => {
    expect(endsAt({ ...hourly, roundCount: 0 })).toEqual(hourly.startsAt);
  });
});

describe("groupOf", () => {
  it("puts the first rounds in group zero", () => {
    expect(groupOf(0, 5)).toBe(0);
    expect(groupOf(4, 5)).toBe(0);
  });

  it("starts the next group after the size is passed", () => {
    expect(groupOf(5, 5)).toBe(1);
    expect(groupOf(6, 7)).toBe(0);
    expect(groupOf(7, 7)).toBe(1);
  });

  it("refuses a round before the run", () => {
    expect(groupOf(-1, 5)).toBe(-1);
  });

  it("refuses a group with no size", () => {
    expect(groupOf(3, 0)).toBe(-1);
  });
});

describe("groupCount", () => {
  it("counts a partial group as a group", () => {
    expect(groupCount(20, 5)).toBe(4);
    expect(groupCount(22, 5)).toBe(5);
    expect(groupCount(30, 7)).toBe(5);
  });
});
