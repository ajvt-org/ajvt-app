import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, readdirSync } from "node:fs";

function scaffold(name: string): string {
  return execFileSync("node", ["scripts/new-migration.mjs", name], { encoding: "utf8" })
    .trim()
    .split("\n")
    .at(-1) as string;
}

function lastExisting(): string {
  return readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .at(-1) as string;
}

describe("the migration scaffold", () => {
  it("names a folder that sorts after every existing one", () => {
    const before = lastExisting();
    const folder = scaffold("scaffold_probe");
    try {
      expect(folder.replace("prisma/migrations/", "") > before).toBe(true);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("leaves an empty migration.sql ready to write", () => {
    const folder = scaffold("scaffold_probe");
    try {
      expect(existsSync(`${folder}/migration.sql`)).toBe(true);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("refuses a name that is not lower snake case", () => {
    expect(() => scaffold("Not Snake Case")).toThrow();
  });

  it("refuses no name at all", () => {
    expect(() => execFileSync("node", ["scripts/new-migration.mjs"], { stdio: "pipe" })).toThrow();
  });
});
