import { describe, it, expect } from "vitest";
import {
  NO_AUDIT_FILTERS,
  auditFilterCount,
  pageCount,
  readAuditFilters,
  readPage,
  writeAuditFilters,
} from "@/lib/auditFilters";

describe("carrying the log filters in the address", () => {
  it("reads an empty query as no opinion at all", () => {
    expect(readAuditFilters(new URLSearchParams())).toEqual(NO_AUDIT_FILTERS);
  });

  it("writes nothing for the default view", () => {
    expect(writeAuditFilters(NO_AUDIT_FILTERS).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = {
      admin: "boss",
      action: "APPROVE_MEMBER",
      target: "Member",
      from: "2026-03-01",
      to: "2026-03-31",
    };
    expect(readAuditFilters(new URLSearchParams(writeAuditFilters(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("keeps the page only once it is past the first", () => {
    expect(writeAuditFilters(NO_AUDIT_FILTERS, 1).get("page")).toBeNull();
    expect(writeAuditFilters(NO_AUDIT_FILTERS, 4).get("page")).toBe("4");
  });

  it("counts what is narrowing the list", () => {
    expect(auditFilterCount(NO_AUDIT_FILTERS)).toBe(0);
    expect(auditFilterCount({ ...NO_AUDIT_FILTERS, admin: "boss", from: "2026-01-01" })).toBe(2);
  });
});

describe("reading the page out of the address", () => {
  it("falls back to the first page for anything that is not a later one", () => {
    for (const raw of ["", "0", "1", "-3", "abc", "2.5"]) {
      expect(readPage(new URLSearchParams(`page=${raw}`)), raw).toBe(1);
    }
  });

  it("takes a later page as given", () => {
    expect(readPage(new URLSearchParams("page=7"))).toBe(7);
  });
});

describe("how many pages a count needs", () => {
  it("is one when there is nothing, so the paging never disappears mid render", () => {
    expect(pageCount(0, 50)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(pageCount(50, 50)).toBe(1);
    expect(pageCount(51, 50)).toBe(2);
    expect(pageCount(140, 50)).toBe(3);
  });
});
