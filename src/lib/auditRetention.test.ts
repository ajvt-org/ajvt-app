import { describe, it, expect } from "vitest";
import { AUDIT_LOGIN_DAYS, AUDIT_LOG_DAYS, auditCutoff } from "./auditRetention";

describe("how far back the action log is kept", () => {
  it("keeps a login for a shorter while than everything else", () => {
    expect(AUDIT_LOGIN_DAYS).toBeLessThan(AUDIT_LOG_DAYS);
  });

  it("puts the cutoff that many days before now", () => {
    expect(auditCutoff(new Date("2026-09-13T10:30:00.000Z"), 30)).toEqual(
      new Date("2026-08-14T10:30:00.000Z"),
    );
  });

  it("keeps the time of day, so a purge does not drift by hours", () => {
    const cutoff = auditCutoff(new Date("2026-09-13T23:59:59.000Z"), 1);
    expect(cutoff.toISOString()).toBe("2026-09-12T23:59:59.000Z");
  });

  it("steps back over a month boundary", () => {
    expect(auditCutoff(new Date("2026-03-02T00:00:00.000Z"), 1).toISOString()).toBe(
      "2026-03-01T00:00:00.000Z",
    );
  });

  it("steps back over a year boundary", () => {
    expect(auditCutoff(new Date("2026-01-01T12:00:00.000Z"), 1).toISOString()).toBe(
      "2025-12-31T12:00:00.000Z",
    );
  });

  it("counts a whole year back from a day that exists in both", () => {
    expect(auditCutoff(new Date("2026-09-13T00:00:00.000Z"), AUDIT_LOG_DAYS).toISOString()).toBe(
      "2025-09-13T00:00:00.000Z",
    );
  });

  it("leaves now alone", () => {
    const now = new Date("2026-09-13T10:30:00.000Z");
    auditCutoff(now, 400);
    expect(now.toISOString()).toBe("2026-09-13T10:30:00.000Z");
  });
});
