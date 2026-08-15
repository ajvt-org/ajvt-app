import { describe, it, expect } from "vitest";
import { auditDiff } from "./auditDiff";

describe("auditDiff", () => {
  it("lists the fields the action wrote", () => {
    expect(auditDiff({ status: "PENDING" }, { status: "ACTIVE" })).toEqual([
      { key: "status", from: "PENDING", to: "ACTIVE" },
    ]);
  });

  it("skips fields the action left where they were", () => {
    expect(auditDiff({ status: "ACTIVE", name: "محمد" }, { status: "ACTIVE" })).toEqual([]);
  });

  it("ignores keys that only the before snapshot carries", () => {
    const before = { status: "PENDING", phone: "22334455", age: "المنصورين" };

    expect(auditDiff(before, { status: "ACTIVE" })).toEqual([
      { key: "status", from: "PENDING", to: "ACTIVE" },
    ]);
  });

  it("treats a missing before as a creation", () => {
    expect(auditDiff(undefined, { name: "المنصورون" })).toEqual([
      { key: "name", from: undefined, to: "المنصورون" },
    ]);
  });

  it("counts a field going from null to a value", () => {
    expect(auditDiff({ memberNumber: null }, { memberNumber: "2026-001" })).toEqual([
      { key: "memberNumber", from: null, to: "2026-001" },
    ]);
  });

  it("does not report null and undefined as a change", () => {
    expect(auditDiff({ rejectionReason: null }, { rejectionReason: undefined })).toEqual([]);
  });

  it("compares nested values rather than identity", () => {
    expect(auditDiff({ tags: ["a"] }, { tags: ["a"] })).toEqual([]);
    expect(auditDiff({ tags: ["a"] }, { tags: ["b"] })).toEqual([
      { key: "tags", from: ["a"], to: ["b"] },
    ]);
  });

  it("returns nothing when there is no after snapshot", () => {
    expect(auditDiff({ status: "ACTIVE" }, undefined)).toEqual([]);
    expect(auditDiff({ status: "ACTIVE" }, null)).toEqual([]);
  });
});
