import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CONST_HANDLER = /export const (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*=\s*(withRoute\()?/g;
const FUNCTION_HANDLER =
  /export (?:async )?function (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*\(/g;

// The handlers that predate withRoute, as a debt list. A route added from here
// on has to be wrapped, so this list can only get shorter. Taking an entry off
// it is the last step of migrating that route, never the first.
//
// The five files/* routes answer with image bytes rather than JSON, so wrapping
// them changes what a failure looks like to an <img> tag. They come last.
// docs/route-migration.md has the order and the reasoning.
const NOT_YET_WRAPPED = [
  "files/[filename]/route.ts GET",
  "files/activity/[filename]/route.ts GET",
  "files/donation/[filename]/route.ts GET",
  "files/member/[filename]/route.ts GET",
  "files/team/[filename]/route.ts GET",
];

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

// Per exported handler, not per file: a file can wrap three handlers and leave
// the fourth bare, and checking the file as a whole would call it compliant.
// The same mistake let an unaudited handler hide behind a compliant sibling in
// auditCoverage.test.ts, which this follows.
export function unwrappedHandlers(source: string): string[] {
  const wrapped = [...source.matchAll(CONST_HANDLER)].filter((m) => m[2]).map((m) => m[1]);
  const bare = [...source.matchAll(CONST_HANDLER)].filter((m) => !m[2]).map((m) => m[1]);
  const functions = [...source.matchAll(FUNCTION_HANDLER)].map((m) => m[1]);
  return [...bare, ...functions].filter((name) => !wrapped.includes(name));
}

function unwrapped(): string[] {
  return routeFiles("src/app/api").flatMap((path) => {
    const route = path.replace("src/app/api/", "");
    return unwrappedHandlers(readFileSync(path, "utf8")).map((name) => `${route} ${name}`);
  });
}

describe("route conventions", () => {
  it("finds the handlers across every route file", () => {
    const total = routeFiles("src/app/api").length;
    expect(total).toBeGreaterThan(100);
  });

  it("reads a handler as wrapped only when withRoute is what it is assigned", () => {
    const source = `
      export const GET = withRoute("g", async () => {});
      export const POST = async () => {};
      export async function DELETE() {}
    `;
    expect(unwrappedHandlers(source)).toEqual(["POST", "DELETE"]);
  });

  it("does not let a wrapped handler vouch for a bare one beside it", () => {
    const source = `
      export const GET = withRoute("g", async () => {});
      export const PATCH = async () => {};
    `;
    expect(unwrappedHandlers(source)).toEqual(["PATCH"]);
  });

  it("leaves no route handler outside withRoute except the ones already known", () => {
    expect(unwrapped().sort()).toEqual([...NOT_YET_WRAPPED].sort());
  });

  it("keeps the debt list honest, with nothing on it that is already wrapped", () => {
    const outstanding = unwrapped();
    expect(NOT_YET_WRAPPED.filter((entry) => !outstanding.includes(entry))).toEqual([]);
  });
});
