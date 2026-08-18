import { describe, it, expect } from "vitest";
import {
  alreadyInstalled,
  shouldOffer,
  snoozeActive,
  snoozeUntil,
  SNOOZE_DAYS,
} from "@/lib/installPrompt";

const now = new Date("2026-03-01T10:00:00.000Z");

describe("snoozeUntil", () => {
  it("pushes the next offer a snooze window out", () => {
    expect(new Date(snoozeUntil(now)).toISOString().slice(0, 10)).toBe("2026-03-15");
    expect(SNOOZE_DAYS).toBe(14);
  });
});

describe("snoozeActive", () => {
  it("is quiet while the window is open", () => {
    expect(snoozeActive(String(snoozeUntil(now)), now)).toBe(true);
  });

  it("wakes up once the window has passed", () => {
    expect(snoozeActive(String(now.getTime() - 1), now)).toBe(false);
  });

  it("treats nothing stored, or junk, as never snoozed", () => {
    expect(snoozeActive(null, now)).toBe(false);
    expect(snoozeActive("abc", now)).toBe(false);
  });
});

describe("alreadyInstalled", () => {
  it("reads the flag left behind by an install", () => {
    expect(alreadyInstalled("1")).toBe(true);
  });

  it("treats nothing stored, or junk, as not installed", () => {
    expect(alreadyInstalled(null)).toBe(false);
    expect(alreadyInstalled("0")).toBe(false);
    expect(alreadyInstalled("abc")).toBe(false);
  });
});

describe("shouldOffer", () => {
  it("offers on a fresh session with no snooze", () => {
    expect(shouldOffer({ snoozedUntil: null, seenThisSession: false, installed: false, now })).toBe(
      true,
    );
  });

  it("stays quiet for the rest of the session once shown", () => {
    expect(shouldOffer({ snoozedUntil: null, seenThisSession: true, installed: false, now })).toBe(
      false,
    );
  });

  it("stays quiet while snoozed, even in a new session", () => {
    expect(
      shouldOffer({
        snoozedUntil: String(snoozeUntil(now)),
        seenThisSession: false,
        installed: false,
        now,
      }),
    ).toBe(false);
  });

  it("never offers once the app is installed", () => {
    expect(shouldOffer({ snoozedUntil: null, seenThisSession: false, installed: true, now })).toBe(
      false,
    );
  });
});
