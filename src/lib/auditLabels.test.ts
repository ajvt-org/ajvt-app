import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sourceFiles } from "@tests/sourceFiles";
import { ACTION_LABELS, auditActionLabel, type AuditAction } from "./auditLabels";

const RETIRED: AuditAction[] = ["CREATE_MEMBER_MANUAL", "SEND_QUIZ_QUESTION"];

const retired = new Set<string>(RETIRED);

function actionsNamedInSource(): Set<string> {
  const found = new Set<string>();
  for (const file of [...sourceFiles("src"), ...sourceFiles("prisma")]) {
    if (file.endsWith("auditLabels.ts") || file.endsWith("auditLabels.test.ts")) continue;
    for (const [, action] of readFileSync(file, "utf8").matchAll(/"([A-Z][A-Z0-9_]*)"/g)) {
      found.add(action);
    }
  }
  return found;
}

describe("auditActionLabel", () => {
  it("translates a known action", () => {
    expect(auditActionLabel("APPROVE_MEMBER")).toBe("قبول طلب");
  });

  it("falls back to the raw code for an unknown action", () => {
    expect(auditActionLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("translates an action that only old entries carry", () => {
    expect(auditActionLabel("CREATE_MEMBER_MANUAL")).toBe("إضافة عضو يدوياً");
  });
});

describe("the labels and the code they name", () => {
  it("reads the actions the source names", () => {
    expect(actionsNamedInSource().size).toBeGreaterThan(30);
  });

  it("keeps no label for an action nothing writes and nothing retired", () => {
    const named = actionsNamedInSource();
    const orphans = Object.keys(ACTION_LABELS).filter(
      (action) => !named.has(action) && !retired.has(action),
    );

    expect(orphans).toEqual([]);
  });

  it("retires nothing the code still writes", () => {
    const named = actionsNamedInSource();

    expect(RETIRED.filter((action) => named.has(action))).toEqual([]);
  });
});
