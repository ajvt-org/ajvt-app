import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WRITE = /(?:prisma|tx)\.\w+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;

// Reading a request never needs an audit entry, and these two write rows that
// belong to the visitor rather than to an admin decision.
const NOT_AN_ADMIN_DECISION = ["admin/visits/route.ts"];

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

function writingRoutesWithoutAudit(): string[] {
  return routeFiles("src/app/api/admin")
    .filter((path) => !NOT_AN_ADMIN_DECISION.some((skip) => path.endsWith(skip)))
    .filter((path) => {
      const source = readFileSync(path, "utf8");
      return WRITE.test(source) && !source.includes("logAction(");
    })
    .map((path) => path.replace("src/app/api/", ""));
}

describe("audit coverage", () => {
  it("finds the admin routes that write", () => {
    const writing = routeFiles("src/app/api/admin").filter((path) =>
      WRITE.test(readFileSync(path, "utf8")),
    );
    expect(writing.length).toBeGreaterThan(20);
  });

  it("leaves no admin route writing to the database without an audit entry", () => {
    expect(writingRoutesWithoutAudit()).toEqual([]);
  });
});
