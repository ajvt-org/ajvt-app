import { describe, it, expect } from "vitest";
import {
  validateConfig,
  validateBands,
  bandPercent,
  bandScore,
  isTimestamp,
  MAX_ROUNDS,
  DEFAULT_BANDS,
  DEFAULT_CONFIG,
} from "./competitionConfig";

const config = {
  name: "مسابقة رمضان",
  startsAt: "2026-08-20T08:00:00.000Z",
  ...DEFAULT_CONFIG,
};
const with_ = (over: Partial<typeof config>) => validateConfig({ ...config, ...over });

describe("validateConfig", () => {
  it("accepts the defaults with a name and a start", () => {
    expect(validateConfig(config)).toBeNull();
  });

  it("needs a name", () => {
    expect(with_({ name: "   " })).toBe("اسم المسابقة مطلوب");
  });

  it("refuses a start that is not a real moment", () => {
    expect(with_({ startsAt: "not a time" })).toBe("وقت البداية غير صالح");
    expect(with_({ startsAt: "" })).toBe("وقت البداية غير صالح");
  });

  it("refuses a run of no rounds", () => {
    expect(with_({ roundCount: 0 })).toBe("عدد الجولات غير صالح");
  });

  it("refuses more rounds than it will ever lay out", () => {
    expect(with_({ roundCount: MAX_ROUNDS + 1 })).toContain(String(MAX_ROUNDS));
  });

  it("refuses a round longer than the gap between rounds", () => {
    expect(with_({ roundPeriodMinutes: 60, roundWindowMinutes: 90 })).toContain(
      "مدة الجولة يجب ألا تتجاوز",
    );
  });

  it("accepts a round exactly as long as the gap", () => {
    expect(with_({ roundPeriodMinutes: 60, roundWindowMinutes: 60 })).toBeNull();
  });

  it("accepts an hourly run", () => {
    expect(
      with_({
        roundCount: 20,
        roundPeriodMinutes: 60,
        roundWindowMinutes: 45,
        groupSize: 5,
        countingRounds: 4,
      }),
    ).toBeNull();
  });

  it("refuses a pool smaller than a round serves", () => {
    expect(with_({ servedCount: 10, poolSize: 5 })).toContain("حجم المخزون");
  });

  it("allows a pool exactly the size of the round", () => {
    expect(with_({ servedCount: 10, poolSize: 10 })).toBeNull();
  });

  it("refuses counting more rounds than a group holds", () => {
    expect(with_({ groupSize: 5, countingRounds: 6 })).toContain("الجولات المحتسبة");
  });

  it("allows counting every round of a group", () => {
    expect(with_({ groupSize: 5, countingRounds: 5 })).toBeNull();
  });

  it("refuses a group of no rounds", () => {
    expect(with_({ groupSize: 0 })).toBe("عدد جولات المجموعة غير صالح");
  });
});

describe("validateBands", () => {
  it("accepts the defaults", () => {
    expect(validateBands(DEFAULT_BANDS)).toBeNull();
  });

  it("needs the last band to cover everything after it", () => {
    expect(validateBands([{ maxSeconds: 10, percent: 100 }])).toContain("الشريحة الأخيرة");
  });

  it("needs the bounds to climb", () => {
    expect(
      validateBands([
        { maxSeconds: 30, percent: 100 },
        { maxSeconds: 10, percent: 75 },
        { maxSeconds: null, percent: 50 },
      ]),
    ).toContain("تصاعدية");
  });

  it("needs the rewards to fall", () => {
    expect(
      validateBands([
        { maxSeconds: 10, percent: 50 },
        { maxSeconds: null, percent: 100 },
      ]),
    ).toContain("تنازلية");
  });

  it("keeps a percentage a percentage", () => {
    expect(validateBands([{ maxSeconds: null, percent: 120 }])).toContain("بين 0 و 100");
  });

  it("refuses an empty set", () => {
    expect(validateBands([])).toContain("شريحة سرعة واحدة");
  });
});

describe("bandPercent", () => {
  it("gives the fastest band inside its bound", () => {
    expect(bandPercent(DEFAULT_BANDS, 0)).toBe(100);
    expect(bandPercent(DEFAULT_BANDS, 9_999)).toBe(100);
    expect(bandPercent(DEFAULT_BANDS, 10_000)).toBe(100);
  });

  it("drops a band once the bound is passed", () => {
    expect(bandPercent(DEFAULT_BANDS, 10_001)).toBe(75);
    expect(bandPercent(DEFAULT_BANDS, 30_000)).toBe(75);
    expect(bandPercent(DEFAULT_BANDS, 30_001)).toBe(50);
  });

  it("gives two members at a similar pace the same band", () => {
    expect(bandPercent(DEFAULT_BANDS, 3_000)).toBe(bandPercent(DEFAULT_BANDS, 7_400));
  });
});

describe("bandScore", () => {
  it("pays the full points in the fastest band", () => {
    expect(bandScore(10, DEFAULT_BANDS, 1_000)).toBe(10);
  });

  it("pays the band's share otherwise", () => {
    expect(bandScore(10, DEFAULT_BANDS, 20_000)).toBe(8);
    expect(bandScore(10, DEFAULT_BANDS, 60_000)).toBe(5);
  });

  it("never rounds a scoring answer down to nothing", () => {
    expect(bandScore(1, DEFAULT_BANDS, 60_000)).toBe(1);
  });

  it("pays nothing for a question worth nothing", () => {
    expect(bandScore(0, DEFAULT_BANDS, 0)).toBe(0);
  });

  it("pays nothing when the band is worth nothing", () => {
    expect(bandScore(10, [{ maxSeconds: null, percent: 0 }], 0)).toBe(0);
  });
});

describe("isTimestamp", () => {
  it("takes a real moment", () => {
    expect(isTimestamp("2026-08-20T08:00:00.000Z")).toBe(true);
  });

  it("refuses anything it cannot read as a time", () => {
    expect(isTimestamp("nonsense")).toBe(false);
    expect(isTimestamp("")).toBe(false);
  });
});
