import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { findDuplicateAccounts, applyDuplicatePlans } from "@/lib/duplicateMembersServer";
import { resetDb, createUser } from "./helpers";

// The cleanup writes Member rows and nothing else. An account is what the
// person signs in with, so it survives whatever happens to the memberships
// hanging off it.
//
// It only ever runs against data made before the unique index, so these set
// up that world: the index goes for the duration and comes back after, which
// is safe because the api config runs test files one at a time. Recreated
// only if it was there to begin with, so this reads the same on a branch that
// predates the index.

const INDEX = "Member_userId_key";
let hadIndex = false;

beforeAll(async () => {
  const rows = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE tablename = 'Member' AND indexname = ${INDEX}`;
  hadIndex = rows.length > 0;
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${INDEX}"`);
});

afterAll(async () => {
  if (hadIndex) {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "${INDEX}" ON "Member"("userId")`);
  }
});

async function member(
  userId: string | null,
  over: Partial<{
    fullName: string;
    status: "PENDING" | "ACTIVE" | "REJECTED";
    memberNumber: string;
    createdAt: Date;
  }> = {},
) {
  return prisma.member.create({
    data: {
      userId,
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "REJECTED",
      ...over,
    },
  });
}

async function settle() {
  return applyDuplicatePlans(await findDuplicateAccounts(), prisma);
}

describe("settling accounts that hold several memberships", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keeps the account and its approved membership, drops the bare duplicate", async () => {
    const user = await createUser();
    const approved = await member(user.id, { status: "ACTIVE", memberNumber: "AJVT-1" });
    const duplicate = await member(user.id, { fullName: "طلب مكرر" });

    const done = await settle();

    expect(done).toEqual({ removed: 1, detached: 0 });
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await prisma.member.findUnique({ where: { id: approved.id } })).not.toBeNull();
    expect(await prisma.member.findUnique({ where: { id: duplicate.id } })).toBeNull();
  });

  it("deletes no account even when every membership on it goes", async () => {
    const user = await createUser();
    await member(user.id, { createdAt: new Date("2026-01-01") });
    await member(user.id, { createdAt: new Date("2026-02-01") });
    await member(user.id, { createdAt: new Date("2026-03-01") });

    await settle();

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.member.count({ where: { userId: user.id } })).toBe(1);
  });

  it("detaches a duplicate that carries records instead of deleting it", async () => {
    const user = await createUser();
    const approved = await member(user.id, { status: "ACTIVE", memberNumber: "AJVT-1" });
    const carrying = await member(user.id, { status: "PENDING", fullName: "بتسجيل" });
    const activity = await prisma.activity.create({
      data: { title: "نشاط", description: "" },
    });
    await prisma.activityRegistration.create({
      data: { memberId: carrying.id, activityId: activity.id, status: "ACTIVE" },
    });

    const done = await settle();

    expect(done).toEqual({ removed: 0, detached: 1 });
    const kept = await prisma.member.findUniqueOrThrow({ where: { id: approved.id } });
    expect(kept.userId).toBe(user.id);
    const detached = await prisma.member.findUniqueOrThrow({ where: { id: carrying.id } });
    expect(detached.userId).toBeNull();
    expect(await prisma.activityRegistration.count()).toBe(1);
    expect(await prisma.user.count()).toBe(1);
  });

  it("leaves an account holding a single membership alone", async () => {
    const user = await createUser();
    const only = await member(user.id, { status: "ACTIVE" });

    const done = await settle();

    expect(done).toEqual({ removed: 0, detached: 0 });
    expect(await prisma.member.findUniqueOrThrow({ where: { id: only.id } })).toBeDefined();
  });

  it("ignores members with no account, however many there are", async () => {
    await member(null);
    await member(null);

    const done = await settle();

    expect(done).toEqual({ removed: 0, detached: 0 });
    expect(await prisma.member.count()).toBe(2);
  });

  it("runs a second time with nothing left to do", async () => {
    const user = await createUser();
    await member(user.id, { status: "ACTIVE" });
    await member(user.id);

    await settle();

    expect(await settle()).toEqual({ removed: 0, detached: 0 });
  });
});
