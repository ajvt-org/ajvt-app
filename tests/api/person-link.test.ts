import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";

const LINKED = [
  "activityRegistration",
  "teamMember",
  "mvpCandidate",
  "matchBooking",
  "matchGoal",
  "matchPenaltyKick",
  "donation",
  "membership",
  "payment",
  "receipt",
  "suspension",
] as const;

async function seedEverything() {
  const { execSync } = await import("node:child_process");
  execSync("npx tsx prisma/seed.ts", { stdio: "pipe", env: process.env });
}

async function accountsNamedBy(table: (typeof LINKED)[number]): Promise<string[]> {
  const rows = await (
    prisma[table] as unknown as {
      findMany: (a: unknown) => Promise<{ userId: string | null }[]>;
    }
  ).findMany({ select: { userId: true } });
  return rows.map((row) => row.userId).filter((id): id is string => id !== null);
}

describe("every link names the person", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("points every link at an account that exists", async () => {
    await seedEverything();

    const dangling: string[] = [];
    for (const table of LINKED) {
      const ids = [...new Set(await accountsNamedBy(table))];
      if (ids.length === 0) continue;
      const found = await prisma.user.count({ where: { id: { in: ids } } });
      if (found !== ids.length) dangling.push(table);
    }

    expect(dangling).toEqual([]);
  });
});
