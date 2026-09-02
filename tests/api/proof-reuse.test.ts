import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLE } from "@/lib/adminRoles";
import { findProofReuse } from "@/lib/proofReuse";
import { resetDb, makeMember } from "./helpers";

const HASH = "a".repeat(64);
const OTHER = "b".repeat(64);

async function fingerprint(filename: string, sha256: string) {
  return prisma.proofImage.create({ data: { filename, sha256 } });
}

async function memberWithProof(fullName: string, paymentProof: string) {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "PENDING",
    paymentProof,
  });
}

const ADMIN = { role: SUPER_ROLE };

describe("spotting a payment screenshot that has been sent before", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("says nothing when there is no proof at all", async () => {
    expect(await findProofReuse(null, ADMIN)).toEqual([]);
    expect(await findProofReuse(undefined, ADMIN)).toEqual([]);
  });

  it("says nothing for a file that was never fingerprinted", async () => {
    expect(await findProofReuse("unknown.webp", ADMIN)).toEqual([]);
  });

  it("says nothing when the image is used once", async () => {
    await fingerprint("one.webp", HASH);
    await memberWithProof("محمد", "one.webp");

    expect(await findProofReuse("one.webp", ADMIN)).toEqual([]);
  });

  // Two different filenames, byte-identical content: the case the whole thing
  // exists for.
  it("finds the other member who sent the same image", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    const first = await memberWithProof("محمد", "one.webp");
    await memberWithProof("أحمد", "two.webp");

    const reuse = await findProofReuse("two.webp", ADMIN);

    expect(reuse).toHaveLength(1);
    expect(reuse[0]).toMatchObject({ kind: "member", id: first.userId, label: "محمد" });
  });

  it("does not report a record against itself", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    const mine = await memberWithProof("محمد", "one.webp");
    await memberWithProof("أحمد", "two.webp");

    const reuse = await findProofReuse("one.webp", ADMIN, { kind: "member", id: mine.userId });

    expect(reuse.map((r) => r.label)).toEqual(["أحمد"]);
  });

  it("does not report a donation against itself", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    const mine = await prisma.donation.create({
      data: {
        amount: 500,
        donorName: "محمد",
        status: "PENDING",
        source: "PUBLIC",
        proof: "one.webp",
      },
    });
    await memberWithProof("أحمد", "two.webp");

    const reuse = await findProofReuse("one.webp", ADMIN, { kind: "donation", id: mine.id });

    expect(reuse.map((r) => r.label)).toEqual(["أحمد"]);
  });

  it("keeps a different image apart", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", OTHER);
    await memberWithProof("محمد", "one.webp");
    await memberWithProof("أحمد", "two.webp");

    expect(await findProofReuse("two.webp", ADMIN)).toEqual([]);
  });

  // A membership proof reused as a donation proof is the same trick.
  it("looks across donations and expenses too", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    await fingerprint("three.webp", HASH);
    await prisma.donation.create({
      data: {
        amount: 500,
        donorName: "محمد",
        status: "ACTIVE",
        source: "PUBLIC",
        proof: "one.webp",
      },
    });
    await prisma.expense.create({
      data: { label: "كرات", amount: 900, createdBy: "admin", proof: "two.webp" },
    });
    await memberWithProof("أحمد", "three.webp");

    const reuse = await findProofReuse("three.webp", ADMIN);

    expect(reuse.map((r) => r.kind).sort()).toEqual(["donation", "expense"]);
  });

  it("puts the oldest first, so the original reads as the original", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    await fingerprint("three.webp", HASH);
    const older = await memberWithProof("محمد", "one.webp");
    await prisma.membership.updateMany({
      where: { userId: older.userId },
      data: { createdAt: new Date("2026-01-01T00:00:00Z") },
    });
    const newer = await memberWithProof("أحمد", "two.webp");
    await prisma.membership.updateMany({
      where: { userId: newer.userId },
      data: { createdAt: new Date("2026-06-01T00:00:00Z") },
    });

    const reuse = await findProofReuse("three.webp", ADMIN);

    expect(reuse.map((r) => r.label)).toEqual(["محمد", "أحمد"]);
  });
});
