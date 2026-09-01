import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";

const SEED_TIMEOUT = 120_000;

function tierDatabase(url: string | undefined): string {
  if (!url) throw new Error("DATABASE_URL is not set");
  const name = new URL(url).pathname.slice(1);
  if (!name.startsWith("ajvt_test")) {
    throw new Error(`Refusing to seed "${name}", the api tier writes to its own database only`);
  }
  return url;
}

function runDevSeed(databaseUrl: string) {
  const uploads = mkdtempSync(join(tmpdir(), "ajvt-seed-uploads-"));
  try {
    return spawnSync("npx", ["tsx", "prisma/seed-dev.ts"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl, UPLOAD_DIR: uploads },
    });
  } finally {
    rmSync(uploads, { recursive: true, force: true });
  }
}

describe("the dev seed", () => {
  beforeAll(resetDb);
  afterAll(resetDb);

  it("refuses to wipe a database that is not the tier's own", () => {
    expect(() => tierDatabase("postgresql://ajvt:ajvt@localhost:5433/ajvt")).toThrow();
    expect(() => tierDatabase(undefined)).toThrow();
    expect(tierDatabase("postgresql://ajvt:ajvt@localhost:5433/ajvt_test_abc123")).toContain(
      "ajvt_test_abc123",
    );
  });

  it(
    "runs to the end against the schema as it stands",
    async () => {
      const seed = runDevSeed(tierDatabase(process.env.DATABASE_URL));

      expect(seed.status, seed.stderr).toBe(0);
      expect(await prisma.user.count()).toBeGreaterThan(0);
      expect(
        await prisma.match.count({ where: { manOfTheMatchUserId: { not: null } } }),
      ).toBeGreaterThan(0);
    },
    SEED_TIMEOUT,
  );
});
