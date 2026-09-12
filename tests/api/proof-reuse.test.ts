import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { findProofReuse, proofReuseOf } from "@/lib/proofReuse";
import { resetDb, makeMember, giveGift } from "./helpers";

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
    paidAmount: MEMBERSHIP_FEE,
    paymentProof,
  });
}

async function giftWithProof(donorName: string, proof: string) {
  const donation = await giveGift({ amount: 500, donorName, proof });
  return donation;
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
    const mine = await giftWithProof("محمد", "one.webp");
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

  it("looks across donations and expenses too", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    await fingerprint("three.webp", HASH);
    await giftWithProof("محمد", "one.webp");
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

describe("asking about a proof by its hash", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("says nothing when no image carries that hash", async () => {
    expect(await proofReuseOf(HASH, ADMIN)).toEqual([]);
    expect(await proofReuseOf("", ADMIN)).toEqual([]);
  });

  it("reports the one record holding the image, with nothing to leave out", async () => {
    await fingerprint("one.webp", HASH);
    const member = await memberWithProof("محمد", "one.webp");

    const reuse = await proofReuseOf(HASH, ADMIN);

    expect(reuse).toHaveLength(1);
    expect(reuse[0]).toMatchObject({ kind: "member", id: member.userId, label: "محمد" });
  });

  it("gives the same answer the filename entry gives, minus the row it was asked from", async () => {
    await fingerprint("one.webp", HASH);
    await fingerprint("two.webp", HASH);
    await memberWithProof("محمد", "one.webp");
    await giftWithProof("أحمد", "two.webp");

    const byName = await findProofReuse("two.webp", ADMIN);
    const byHash = await proofReuseOf(HASH, ADMIN);

    expect(byName.map((r) => r.label)).toEqual(["محمد"]);
    expect(byHash.map((r) => r.label).sort()).toEqual(["أحمد", "محمد"]);
    expect(byHash.find((r) => r.kind === "member")).toEqual(byName[0]);
  });

  it("carries the amount, the state and a way in", async () => {
    await fingerprint("one.webp", HASH);
    const gift = await giftWithProof("محمد", "one.webp");

    const [row] = await proofReuseOf(HASH, ADMIN);

    expect(row.amount).toBe(500);
    expect(row.state).toBe("ACTIVE");
    expect(row.href).toBe(`/admin/payments?focus=${gift.id}`);
  });

  it("carries what an expense holds as well", async () => {
    await fingerprint("one.webp", HASH);
    await prisma.expense.create({
      data: { label: "كرات", amount: 900, createdBy: "admin", proof: "one.webp" },
    });

    const [row] = await proofReuseOf(HASH, ADMIN);

    expect(row).toMatchObject({ kind: "expense", label: "كرات", amount: 900, state: null });
    expect(row.href).toBe(`/admin/expenses?q=${encodeURIComponent("كرات")}`);
  });

  it("keeps a confidential supporter's name back on this door too", async () => {
    await fingerprint("one.webp", HASH);
    const member = await memberWithProof("محمد", "one.webp");
    await prisma.user.update({
      where: { id: member.userId },
      data: { supportNameConfidential: true },
    });

    const hidden = await proofReuseOf(HASH, { role: "VIEWER" });
    const open = await proofReuseOf(HASH, { ...ADMIN, onTheRecord: true });

    expect(hidden[0].label).toBe("");
    expect(open[0].label).toBe("محمد");
  });
});
