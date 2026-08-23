import { describe, it, expect } from "vitest";
import { auditFieldLabel, auditTargetLabel, auditValueLabel } from "./auditFields";
import { ROLE_LABELS } from "./adminRoles";

describe("auditFieldLabel", () => {
  it("translates a known field", () => {
    expect(auditFieldLabel("memberNumber")).toBe("رقم العضوية");
  });

  it("falls back to the raw key so a new field still shows", () => {
    expect(auditFieldLabel("someNewColumn")).toBe("someNewColumn");
  });
});

describe("auditTargetLabel", () => {
  it("translates a known target type", () => {
    expect(auditTargetLabel("AgeGroup")).toBe("عصر");
  });

  it("falls back to the raw type", () => {
    expect(auditTargetLabel("Quiz")).toBe("Quiz");
  });
});

describe("auditValueLabel", () => {
  it("translates the status codes the log is full of", () => {
    expect(auditValueLabel("PENDING")).toBe("قيد المراجعة");
    expect(auditValueLabel("ACTIVE")).toBe("معتمد");
  });

  it("names an admin role the same way the admin list does", () => {
    expect(auditValueLabel("SUPER")).toBe(ROLE_LABELS.SUPER);
    expect(auditValueLabel("MEMBERS")).toBe(ROLE_LABELS.MEMBERS);
  });

  it("shows a dash for anything empty", () => {
    expect(auditValueLabel(null)).toBe("—");
    expect(auditValueLabel(undefined)).toBe("—");
    expect(auditValueLabel("")).toBe("—");
  });

  it("keeps a value it does not know", () => {
    expect(auditValueLabel("2026-001")).toBe("2026-001");
    expect(auditValueLabel(1500)).toBe("1500");
  });

  it("renders a nested value rather than [object Object]", () => {
    expect(auditValueLabel({ a: 1 })).toBe('{"a":1}');
  });

  it("does not turn zero into a dash", () => {
    expect(auditValueLabel(0)).toBe("0");
  });
});
