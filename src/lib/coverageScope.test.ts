import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { DATABASE_BOUND_LIB } from "@tests/coverageScope.mjs";

const PRISMA_IMPORT = /from ["'](\.\/prisma|@\/lib\/prisma)["']/;

function libModules(): string[] {
  return readdirSync("src/lib", { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name)
    .filter((name) => !name.endsWith(".test.ts"))
    .map((name) => `src/lib/${name}`)
    .sort();
}

function bindsPrisma(path: string): boolean {
  if (path === "src/lib/prisma.ts") return true;
  return PRISMA_IMPORT.test(readFileSync(path, "utf8"));
}

describe("what the unit coverage measures", () => {
  it("leaves out every lib module bound to prisma, since only the api suite reaches those", () => {
    const bound = libModules().filter(bindsPrisma);

    expect(bound.filter((path) => !DATABASE_BOUND_LIB.includes(path))).toEqual([]);
  });

  it("holds nothing that pure tests could cover, so the floor stays honest", () => {
    const pure = libModules().filter((path) => !bindsPrisma(path));

    expect(DATABASE_BOUND_LIB.filter((path) => pure.includes(path))).toEqual([]);
  });

  it("names no module that has left the tree", () => {
    const present = new Set(libModules());

    expect(DATABASE_BOUND_LIB.filter((path) => !present.has(path))).toEqual([]);
  });

  it("counts the prisma client itself as bound, since it exports no logic to cover", () => {
    expect(DATABASE_BOUND_LIB).toContain("src/lib/prisma.ts");
  });
});
