import { describe, it, expect } from "vitest";
import { endingHistory, endingsBroughtBack, type EndingAuditRow } from "./membershipEndingHistory";

function ended(over: Partial<EndingAuditRow> & { year?: number; reason?: string } = {}) {
  const { year = 2026, reason = "سبب", ...row } = over;
  return {
    action: "END_MEMBERSHIP",
    adminUsername: "amina",
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    before: { year, endedAt: null, endedReason: null, endedBy: null },
    after: { year, endedAt: "2026-03-01T10:00:00.000Z", endedReason: reason, endedBy: "amina" },
    ...row,
  } as EndingAuditRow;
}

function restored(over: Partial<EndingAuditRow> & { year?: number } = {}) {
  const { year = 2026, ...row } = over;
  return {
    action: "RESTORE_MEMBERSHIP",
    adminUsername: "brahim",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    before: { year, endedAt: "2026-03-01T10:00:00.000Z", endedReason: "سبب", endedBy: "amina" },
    after: { year, endedAt: null, endedReason: null, endedBy: null },
    ...row,
  } as EndingAuditRow;
}

describe("reading a membership's endings back out of the action log", () => {
  it("keeps an ending that nothing has undone", () => {
    expect(endingHistory([ended()])).toEqual([
      {
        year: 2026,
        reason: "سبب",
        endedAt: "2026-03-01T10:00:00.000Z",
        endedBy: "amina",
        restoredAt: null,
        restoredBy: null,
      },
    ]);
  });

  it("marks the ending as undone rather than dropping it", () => {
    const [record] = endingHistory([ended(), restored()]);

    expect(record.reason).toBe("سبب");
    expect(record.endedBy).toBe("amina");
    expect(record.restoredAt).toBe("2026-04-01T10:00:00.000Z");
    expect(record.restoredBy).toBe("brahim");
  });

  it("keeps two endings on one year apart", () => {
    const records = endingHistory([
      ended({ reason: "الأول" }),
      restored(),
      ended({
        reason: "الثاني",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        after: {
          year: 2026,
          endedAt: "2026-05-01T10:00:00.000Z",
          endedReason: "الثاني",
          endedBy: "amina",
        },
      }),
    ]);

    expect(records).toHaveLength(2);
    expect(records[0].restoredAt).toBe("2026-04-01T10:00:00.000Z");
    expect(records[1].restoredAt).toBeNull();
  });

  it("undoes the ending of the year the restore names, not the latest one", () => {
    const records = endingHistory([
      ended({ year: 2025, reason: "قديم" }),
      ended({ year: 2026, reason: "جديد" }),
      restored({ year: 2025 }),
    ]);

    expect(records[0].restoredAt).toBe("2026-04-01T10:00:00.000Z");
    expect(records[1].restoredAt).toBeNull();
  });

  it("ignores a restore that answers to no ending", () => {
    expect(endingHistory([restored()])).toEqual([]);
  });

  it("ignores a row written before the snapshots existed", () => {
    expect(endingHistory([ended({ after: null }), restored({ before: null })])).toEqual([]);
  });

  it("falls back to the row itself where the snapshot carries no date or admin", () => {
    const [record] = endingHistory([ended({ after: { year: 2026, endedReason: "سبب" } })]);

    expect(record.endedAt).toBe("2026-03-01T10:00:00.000Z");
    expect(record.endedBy).toBe("amina");
  });

  it("reads a date that arrived as a string", () => {
    const [record] = endingHistory([
      ended(),
      restored({ createdAt: "2026-04-02T10:00:00.000Z" as unknown as Date }),
    ]);

    expect(record.restoredAt).toBe("2026-04-02T10:00:00.000Z");
  });
});

describe("which endings the card shows", () => {
  it("shows only the ones that were brought back, newest first", () => {
    const records = endingHistory([
      ended({ reason: "الأول" }),
      restored(),
      ended({
        reason: "الثاني",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        after: {
          year: 2026,
          endedAt: "2026-05-01T10:00:00.000Z",
          endedReason: "الثاني",
          endedBy: "amina",
        },
      }),
      restored({ createdAt: new Date("2026-06-01T10:00:00.000Z") }),
      ended({
        reason: "الثالث",
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        after: {
          year: 2026,
          endedAt: "2026-07-01T10:00:00.000Z",
          endedReason: "الثالث",
          endedBy: "amina",
        },
      }),
    ]);

    expect(endingsBroughtBack(records, 2026).map((r) => r.reason)).toEqual(["الثاني", "الأول"]);
  });

  it("leaves out the endings of another year", () => {
    const records = endingHistory([ended({ year: 2025 }), restored({ year: 2025 })]);

    expect(endingsBroughtBack(records, 2026)).toEqual([]);
  });
});
