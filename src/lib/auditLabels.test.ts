import { describe, it, expect } from "vitest";
import { auditActionLabel } from "./auditLabels";

describe("auditActionLabel", () => {
  it("translates a known action", () => {
    expect(auditActionLabel("APPROVE_MEMBER")).toBe("قبول طلب");
  });

  it("falls back to the raw code for an unknown action", () => {
    expect(auditActionLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
