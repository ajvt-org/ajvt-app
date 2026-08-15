import { describe, it, expect } from "vitest";
import { formatActivityDates } from "./activityDates";

const NOW = new Date("2026-06-01T00:00:00Z");
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const at = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00Z`);

function shown(activity: Parameters<typeof formatActivityDates>[0]) {
  return formatActivityDates(activity, NOW);
}

describe("formatActivityDates", () => {
  it("shows a single day", () => {
    expect(shown({ startsAt: utc("2026-09-12") })).toBe("12 سبتمبر");
  });

  it("treats an end on the same day as a single day", () => {
    expect(shown({ startsAt: utc("2026-09-12"), endsAt: utc("2026-09-12") })).toBe("12 سبتمبر");
  });

  it("names two days rather than dashing them", () => {
    expect(shown({ startsAt: utc("2026-09-12"), endsAt: utc("2026-09-13") })).toBe(
      "يومي 12 و 13 سبتمبر",
    );
  });

  it("dashes three days or more", () => {
    expect(shown({ startsAt: utc("2026-08-24"), endsAt: utc("2026-08-29") })).toBe("24 - 29 أغسطس");
  });

  it("names both months when a span crosses one", () => {
    expect(shown({ startsAt: utc("2026-08-29"), endsAt: utc("2026-09-02") })).toBe(
      "29 أغسطس - 2 سبتمبر",
    );
  });

  it("names both months for two days either side of a boundary", () => {
    expect(shown({ startsAt: utc("2026-08-31"), endsAt: utc("2026-09-01") })).toBe(
      "يومي 31 أغسطس و 1 سبتمبر",
    );
  });
});

describe("the year", () => {
  it("is left out when it is the year the reader is in", () => {
    expect(shown({ startsAt: utc("2026-09-12") })).toBe("12 سبتمبر");
  });

  it("is shown for another year", () => {
    expect(shown({ startsAt: utc("2027-09-12") })).toBe("12 سبتمبر 2027");
  });

  it("is shown on a span in another year", () => {
    expect(shown({ startsAt: utc("2025-08-24"), endsAt: utc("2025-08-29") })).toBe(
      "24 - 29 أغسطس 2025",
    );
  });

  it("names both years when a span crosses new year", () => {
    expect(shown({ startsAt: utc("2026-12-30"), endsAt: utc("2027-01-02") })).toBe(
      "30 ديسمبر - 2 يناير 2027",
    );
  });
});

describe("times", () => {
  it("adds a start time", () => {
    expect(shown({ startsAt: at("2026-09-12", "16:00"), withTime: true })).toBe(
      "12 سبتمبر، الساعة 16:00",
    );
  });

  it("adds a range when a single day has an end time", () => {
    expect(
      shown({
        startsAt: at("2026-09-12", "16:00"),
        endsAt: at("2026-09-12", "18:30"),
        withTime: true,
      }),
    ).toBe("12 سبتمبر، من 16:00 إلى 18:30");
  });

  it("gives a multi day span its daily start time", () => {
    expect(
      shown({
        startsAt: at("2026-08-24", "16:00"),
        endsAt: at("2026-08-29", "18:00"),
        withTime: true,
      }),
    ).toBe("24 - 29 أغسطس، الساعة 16:00");
  });

  it("stays silent about times when the activity has none", () => {
    expect(shown({ startsAt: at("2026-09-12", "16:00") })).toBe("12 سبتمبر");
  });

  it("pads the clock so rows line up", () => {
    expect(shown({ startsAt: at("2026-09-12", "09:05"), withTime: true })).toBe(
      "12 سبتمبر، الساعة 09:05",
    );
  });
});

describe("the fallback", () => {
  it("uses the legacy text when no date is set", () => {
    expect(shown({ period: "كل يوم جمعة" })).toBe("كل يوم جمعة");
  });

  it("prefers the dates once they exist", () => {
    expect(shown({ startsAt: utc("2026-09-12"), period: "29-24 اغسطس" })).toBe("12 سبتمبر");
  });

  it("returns nothing when there is neither", () => {
    expect(shown({})).toBeNull();
    expect(shown({ period: "   " })).toBeNull();
  });

  it("falls back rather than printing an invalid date", () => {
    expect(shown({ startsAt: "not a date", period: "الصيف" })).toBe("الصيف");
  });
});

describe("reading in another timezone", () => {
  it("does not slip a day, the dates are calendar facts", () => {
    expect(shown({ startsAt: utc("2026-09-01") })).toBe("1 سبتمبر");
    expect(shown({ startsAt: utc("2026-01-01") })).toBe("1 يناير");
    expect(shown({ startsAt: utc("2025-12-31") })).toBe("31 ديسمبر 2025");
  });
});
