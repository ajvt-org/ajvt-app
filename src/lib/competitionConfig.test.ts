import { describe, it, expect } from "vitest";
import {
  validateConfig,
  validateCurve,
  curvePercent,
  curveScore,
  isTimestamp,
  MAX_ROUNDS,
  DEFAULT_CURVE,
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
        boards: [{ title: "كل خمس جولات", blockRounds: 5, counting: 4, wholeRun: false }],
      }),
    ).toBeNull();
  });

  it("needs at least one ranking", () => {
    expect(with_({ boards: [] })).toContain("ترتيب واحد على الأقل");
  });

  it("refuses a ranking with no title", () => {
    expect(
      with_({ boards: [{ title: "  ", blockRounds: 1, counting: 1, wholeRun: false }] }),
    ).toContain("عنوان الترتيب");
  });

  it("refuses counting more rounds than a ranking covers", () => {
    expect(
      with_({ boards: [{ title: "أسبوعي", blockRounds: 5, counting: 6, wholeRun: false }] }),
    ).toContain("الجولات المحتسبة");
  });

  it("allows counting every round a ranking covers", () => {
    expect(
      with_({ boards: [{ title: "أسبوعي", blockRounds: 5, counting: 5, wholeRun: false }] }),
    ).toBeNull();
  });

  it("refuses a ranking of no rounds", () => {
    expect(
      with_({ boards: [{ title: "فارغ", blockRounds: 0, counting: 1, wholeRun: false }] }),
    ).toContain("عدد جولات الترتيب");
  });

  it("refuses more rankings than the app shows", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      title: `ترتيب ${i}`,
      blockRounds: 1,
      counting: 1,
      wholeRun: false,
    }));

    expect(with_({ boards: many })).toContain("عدد الترتيبات");
  });
});

describe("validateCurve", () => {
  const curve = (over: Partial<typeof DEFAULT_CURVE>) =>
    validateCurve({ ...DEFAULT_CURVE, ...over });

  it("accepts the default curve", () => {
    expect(validateCurve(DEFAULT_CURVE)).toBeNull();
  });

  it("lets the full points window be zero", () => {
    expect(curve({ fullSeconds: 0 })).toBeNull();
  });

  it("refuses a negative full points window", () => {
    expect(curve({ fullSeconds: -1 })).toContain("مهلة النقاط الكاملة");
  });

  it("refuses a question time that does not outlast the full points window", () => {
    expect(curve({ fullSeconds: 30, maxSeconds: 30 })).toContain("مدة السؤال");
    expect(curve({ fullSeconds: 30, maxSeconds: 20 })).toContain("مدة السؤال");
  });

  it("refuses a floor outside 0 to 100", () => {
    expect(curve({ floorPercent: -1 })).toContain("أقل نسبة");
    expect(curve({ floorPercent: 101 })).toContain("أقل نسبة");
  });

  it("lets the floor be zero", () => {
    expect(curve({ floorPercent: 0 })).toBeNull();
  });

  it("refuses a value that is not a whole number", () => {
    expect(curve({ maxSeconds: 30.5 })).toContain("مدة السؤال");
  });
});

describe("curvePercent", () => {
  const curve = { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 };

  it("pays everything inside the full points window", () => {
    expect(curvePercent(curve, 0)).toBe(100);
    expect(curvePercent(curve, 10_000)).toBe(100);
  });

  it("falls in a straight line after it", () => {
    expect(curvePercent(curve, 20_000)).toBe(75);
    expect(curvePercent(curve, 25_000)).toBe(62.5);
  });

  it("reaches the floor at the end of the question", () => {
    expect(curvePercent(curve, 30_000)).toBe(50);
  });

  it("stays on the floor after that", () => {
    expect(curvePercent(curve, 600_000)).toBe(50);
  });

  it("treats a negative elapsed as nothing spent", () => {
    expect(curvePercent(curve, -5_000)).toBe(100);
  });

  it("pays everything up to the end when the floor is 100", () => {
    expect(curvePercent({ ...curve, floorPercent: 100 }, 25_000)).toBe(100);
  });
});

describe("curveScore", () => {
  const curve = { fullSeconds: 10, maxSeconds: 30, floorPercent: 50 };

  it("pays the whole question inside the window", () => {
    expect(curveScore(10, curve, 1_000)).toBe(10);
  });

  it("rounds to the nearest point", () => {
    expect(curveScore(10, curve, 20_000)).toBe(8);
    expect(curveScore(15, curve, 25_000)).toBe(9);
  });

  it("pays the floor share once the question time is up", () => {
    expect(curveScore(10, curve, 60_000)).toBe(5);
    expect(curveScore(7, curve, 60_000)).toBe(4);
  });

  it("pays nothing for a question worth nothing", () => {
    expect(curveScore(0, curve, 0)).toBe(0);
  });

  it("pays nothing when the floor is zero and the time is up", () => {
    expect(curveScore(10, { ...curve, floorPercent: 0 }, 60_000)).toBe(0);
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
