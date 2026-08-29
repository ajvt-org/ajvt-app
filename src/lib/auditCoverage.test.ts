import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WRITE =
  /(?:prisma|tx)\.\w+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;

const HANDLER = /export const (GET|POST|PATCH|PUT|DELETE)\s*=/g;

const NOT_AN_ADMIN_DECISION = ["admin/visits/route.ts"];

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

function handlers(source: string): { name: string; body: string }[] {
  const marks = [...source.matchAll(HANDLER)];
  if (marks.length === 0) return [{ name: "file", body: source }];
  const parts = marks.map((mark, i) => ({
    name: mark[1],
    body: source.slice(mark.index, i + 1 < marks.length ? marks[i + 1].index : source.length),
  }));
  return [{ name: "prelude", body: source.slice(0, marks[0].index) }, ...parts];
}

function writesWithoutAudit(): string[] {
  return routeFiles("src/app/api/admin")
    .filter((path) => !NOT_AN_ADMIN_DECISION.some((skip) => path.endsWith(skip)))
    .flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const route = path.replace("src/app/api/", "");
      return handlers(source)
        .filter((h) => WRITE.test(h.body) && !h.body.includes("logAction("))
        .map((h) => `${route} ${h.name}`);
    });
}

describe("audit coverage", () => {
  it("finds the admin routes that write", () => {
    const writing = routeFiles("src/app/api/admin").filter((path) =>
      WRITE.test(readFileSync(path, "utf8")),
    );
    expect(writing.length).toBeGreaterThan(20);
  });

  it("splits a file into its handlers", () => {
    const source = `
      import x from "y";
      export const GET = withRoute("g", async () => {});
      export const DELETE = withRoute("d", async () => { await prisma.team.delete({}); });
    `;
    expect(handlers(source).map((h) => h.name)).toEqual(["prelude", "GET", "DELETE"]);
  });

  it("leaves no admin handler writing to the database without an audit entry", () => {
    expect(writesWithoutAudit()).toEqual([]);
  });
});
