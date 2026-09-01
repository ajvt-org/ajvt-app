import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";

const SEED_TIMEOUT = 300_000;

function runDevSeed() {
  const uploads = mkdtempSync(join(tmpdir(), "ajvt-seed-uploads-"));
  try {
    return spawnSync("npx", ["tsx", "prisma/seed-dev.ts"], {
      encoding: "utf8",
      env: { ...process.env, UPLOAD_DIR: uploads },
    });
  } finally {
    rmSync(uploads, { recursive: true, force: true });
  }
}

describe("the dev seed", () => {
  afterAll(resetDb);

  it(
    "runs to the end against the schema as it stands",
    async () => {
      const seed = runDevSeed();

      expect(seed.status, seed.stderr).toBe(0);
      expect(await prisma.user.count()).toBeGreaterThan(0);
      expect(
        await prisma.match.count({ where: { manOfTheMatchUserId: { not: null } } }),
      ).toBeGreaterThan(0);
    },
    SEED_TIMEOUT,
  );
});
