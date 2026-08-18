import { describe, it, expect } from "vitest";
import {
  validateConfig,
  validateBands,
  bandPercent,
  bandScore,
  dayStamps,
  isDayStamp,
  DEFAULT_BANDS,
  DEFAULT_CONFIG,
} from "./competitionConfig";

const config = { name: "مسابقة رمضان", startsOn: "2026-08-20", ...DEFAULT_CONFIG };
const with_ = (over: Partial<typeof config>) => validateConfig({ ...config, ...over });

describe("validateConfig", () => {
  it("accepts the defaults with a name and a date", () => {
    expect(validateConfig(config)).toBeNull();
  });

  it("needs a name", () => {
    expect(with_({ name: "   " })).toBe("اسم المسابقة مطلوب");
  });

  it("refuses a date that is not a real day", () => {
    expect(with_({ startsOn: "2026-02-30" })).toBe("تاريخ البداية غير صالح");
    expect(with_({ startsOn: "20/08/2026" })).toBe("تاريخ البداية غير صالح");
  });

  it("refuses a closing time at or before the opening time", () => {
    expect(with_({ publishMinutes: 600, cutoffMinutes: 600 })).toBe(
      "وقت الإغلاق يجب أن يكون بعد وقت الفتح",
    );
    expect(with_({ publishMinutes: 600, cutoffMinutes: 300 })).toBe(
      "وقت الإغلاق يجب أن يكون بعد وقت الفتح",
    );
  });

  it("refuses a pool smaller than the number of questions served", () => {
    expect(with_({ servedCount: 10, poolSize: 5 })).toContain("حجم المخزون");
  });

  it("allows a pool exactly the size of the served set", () => {
    expect(with_({ servedCount: 10, poolSize: 10 })).toBeNull();
  });

  it("keeps the weekly counting days inside a week", () => {
    expect(with_({ weeklyCountingDays: 0 })).toContain("بين 1 و 7");
    expect(with_({ weeklyCountingDays: 8 })).toContain("بين 1 و 7");
    expect(with_({ weeklyCountingDays: 7 })).toBeNull();
  });

  it("refuses a run of no days", () => {
    expect(with_({ days: 0 })).toBe("عدد الأيام غير صالح");
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

describe("dayStamps", () => {
  it("lists each day of the run", () => {
    expect(dayStamps("2026-08-20", 3)).toEqual(["2026-08-20", "2026-08-21", "2026-08-22"]);
  });

  it("crosses a month end", () => {
    expect(dayStamps("2026-08-30", 3)).toEqual(["2026-08-30", "2026-08-31", "2026-09-01"]);
  });

  it("crosses a year end", () => {
    expect(dayStamps("2026-12-31", 2)).toEqual(["2026-12-31", "2027-01-01"]);
  });
});

describe("isDayStamp", () => {
  it("takes a real day", () => {
    expect(isDayStamp("2026-08-20")).toBe(true);
  });

  it("refuses a day that does not exist", () => {
    expect(isDayStamp("2026-02-30")).toBe(false);
    expect(isDayStamp("2026-13-01")).toBe(false);
  });
});
