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

describe("every link carries the person as well as the membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("leaves no row pointing at a member without pointing at their account", async () => {
    await seedEverything();

    const wrong: string[] = [];
    for (const table of LINKED) {
      const rows = await (
        prisma[table] as unknown as {
          findMany: (a: unknown) => Promise<{ memberId: string | null; userId: string | null }[]>;
        }
      ).findMany({ select: { memberId: true, userId: true } });
      for (const row of rows) {
        if (row.memberId && !row.userId) wrong.push(table);
      }
    }

    expect([...new Set(wrong)]).toEqual([]);
  });

  it("points both columns at the same person", async () => {
    await seedEverything();

    const mismatched: string[] = [];
    for (const table of LINKED) {
      const rows = await (
        prisma[table] as unknown as {
          findMany: (
            a: unknown,
          ) => Promise<{ userId: string | null; member: { userId: string } | null }[]>;
        }
      ).findMany({ select: { userId: true, member: { select: { userId: true } } } });
      for (const row of rows) {
        if (row.member && row.member.userId !== row.userId) mismatched.push(table);
      }
    }

    expect([...new Set(mismatched)]).toEqual([]);
  });
});
