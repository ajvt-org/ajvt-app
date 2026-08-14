import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ACTION_LABELS, auditActionLabel } from "./auditLabels";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function loggedActions(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8");
    for (const [, action] of source.matchAll(/logAction\(\s*[^,]+,\s*"([A-Z_]+)"/g)) {
      found.add(action);
    }
    for (const [, , a, b] of source.matchAll(
      /logAction\(\s*[^,]+,\s*(\w+)\s*===\s*"[^"]*"\s*\?\s*"([A-Z_]+)"\s*:\s*"([A-Z_]+)"/g,
    )) {
      found.add(a);
      found.add(b);
    }
  }
  return [...found].sort();
}

describe("auditActionLabel", () => {
  it("translates a known action", () => {
    expect(auditActionLabel("APPROVE_MEMBER")).toBe("قبول طلب");
  });

  it("falls back to the raw code for an unknown action", () => {
    expect(auditActionLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("finds the actions the routes actually log", () => {
    expect(loggedActions().length).toBeGreaterThan(30);
  });

  it("has an arabic label for every action the routes log", () => {
    const missing = loggedActions().filter((action) => !ACTION_LABELS[action]);
    expect(missing).toEqual([]);
  });
});
