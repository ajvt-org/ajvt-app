import { describe, it, expect } from "vitest";
import {
  isTempPasswordActive,
  isTempPasswordExpired,
  tempPasswordExpiry,
} from "@/lib/tempPassword";

const NOW = new Date("2026-08-15T12:00:00Z");
const LATER = new Date("2026-08-15T13:00:00Z");
const EARLIER = new Date("2026-08-15T11:00:00Z");

describe("isTempPasswordActive", () => {
  it("is false for an ordinary password, which has no expiry at all", () => {
    expect(isTempPasswordActive(null, NOW)).toBe(false);
  });

  it("is true while the expiry is still ahead", () => {
    expect(isTempPasswordActive(LATER, NOW)).toBe(true);
  });

  it("is false once the expiry has passed", () => {
    expect(isTempPasswordActive(EARLIER, NOW)).toBe(false);
  });

  it("is false at the exact moment it expires, so the boundary locks out", () => {
    expect(isTempPasswordActive(NOW, NOW)).toBe(false);
  });
});

describe("isTempPasswordExpired", () => {
  it("is false for an ordinary password, so nobody is locked out by a null", () => {
    expect(isTempPasswordExpired(null, NOW)).toBe(false);
  });

  it("is true once the expiry has passed", () => {
    expect(isTempPasswordExpired(EARLIER, NOW)).toBe(true);
  });

  it("never agrees with isTempPasswordActive", () => {
    for (const at of [null, EARLIER, NOW, LATER]) {
      expect(isTempPasswordActive(at, NOW) && isTempPasswordExpired(at, NOW)).toBe(false);
    }
  });
});

describe("tempPasswordExpiry", () => {
  it("adds the hours the admin configured", () => {
    expect(tempPasswordExpiry(24, NOW).toISOString()).toBe("2026-08-16T12:00:00.000Z");
  });

  it("handles an hour as readily as a week", () => {
    expect(tempPasswordExpiry(1, NOW).toISOString()).toBe("2026-08-15T13:00:00.000Z");
    expect(tempPasswordExpiry(168, NOW).toISOString()).toBe("2026-08-22T12:00:00.000Z");
  });
});
