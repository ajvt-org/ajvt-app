import { describe, it, expect } from "vitest";
import { endedDetails, restoredDetails } from "./membershipEndingAudit";

const AT = new Date("2026-09-10T09:00:00.000Z");

describe("what the log keeps about a membership ending", () => {
  it("reads the year as standing before and ended after", () => {
    expect(endedDetails(2026, { reason: "مخالفة النظام الداخلي", by: "boss", at: AT })).toEqual({
      before: { year: 2026, endedAt: null, endedReason: null, endedBy: null },
      after: {
        year: 2026,
        endedAt: AT.toISOString(),
        endedReason: "مخالفة النظام الداخلي",
        endedBy: "boss",
      },
    });
  });

  it("reads a restore as the ending it undid", () => {
    expect(
      restoredDetails({
        year: 2026,
        endedAt: AT,
        endedReason: "مخالفة النظام الداخلي",
        endedBy: "boss",
      }),
    ).toEqual({
      before: {
        year: 2026,
        endedAt: AT.toISOString(),
        endedReason: "مخالفة النظام الداخلي",
        endedBy: "boss",
      },
      after: { year: 2026, endedAt: null, endedReason: null, endedBy: null },
    });
  });

  it("keeps an unended membership readable in a restore", () => {
    expect(
      restoredDetails({ year: 2026, endedAt: null, endedReason: null, endedBy: null }).before,
    ).toEqual({ year: 2026, endedAt: null, endedReason: null, endedBy: null });
  });
});
