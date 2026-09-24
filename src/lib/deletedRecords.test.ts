import { describe, it, expect } from "vitest";
import {
  retentionExpiry,
  daysLeft,
  confirmationMatches,
  archiveEntry,
  canHandleKind,
  RETENTION_DAYS,
} from "@/lib/deletedRecords";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";

const AT = new Date("2026-03-01T10:00:00.000Z");

describe("retentionExpiry", () => {
  it("puts the expiry a retention window ahead", () => {
    const expiry = retentionExpiry(new Date("2026-03-01T10:00:00.000Z"));
    expect(expiry.toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  it("takes a shorter window when asked", () => {
    const expiry = retentionExpiry(new Date("2026-03-01T10:00:00.000Z"), 2);
    expect(expiry.toISOString().slice(0, 10)).toBe("2026-03-03");
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-03-01T10:00:00.000Z");

  it("counts the days still on the clock", () => {
    expect(daysLeft(retentionExpiry(now), now)).toBe(RETENTION_DAYS);
  });

  it("never goes below zero once the window has passed", () => {
    expect(daysLeft(new Date("2026-02-01T10:00:00.000Z"), now)).toBe(0);
  });
});

describe("confirmationMatches", () => {
  it("accepts the exact name", () => {
    expect(confirmationMatches("محمد ولد أحمد", "محمد ولد أحمد")).toBe(true);
  });

  it("forgives stray spacing, which is not the point of the check", () => {
    expect(confirmationMatches("  محمد   ولد أحمد ", "محمد ولد أحمد")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(confirmationMatches("محمد", "محمد ولد أحمد")).toBe(false);
    expect(confirmationMatches("", "محمد ولد أحمد")).toBe(false);
  });
});

describe("archiveEntry", () => {
  it("carries the record and an expiry a retention window ahead", () => {
    const entry = archiveEntry("Election", "e1", "انتخاب", { id: "e1" }, "admin", AT);

    expect(entry).toMatchObject({ kind: "Election", recordId: "e1", label: "انتخاب" });
    expect(entry.deletedBy).toBe("admin");
    expect(entry.expiresAt.toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

describe("canHandleKind", () => {
  it("leaves a member or an account to every role that reaches the screen", () => {
    expect(canHandleKind("MEMBERS", "Member")).toBe(true);
    expect(canHandleKind("MEMBERS", "User")).toBe(true);
  });

  it("keeps an election to the roles that reach the elections screen", () => {
    expect(canHandleKind("MEMBERS", "Election")).toBe(false);
    expect(canHandleKind(SUPER_ROLE, "Election")).toBe(true);
    expect(canHandleKind(OWNER_ROLE, "Election")).toBe(true);
  });
});
