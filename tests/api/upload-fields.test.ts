import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { UPLOAD_FIELDS, locateUpload, renameUpload } from "@/lib/uploadFields";
import { resetDb, createUser } from "./helpers";

async function memberWith(over: Record<string, unknown>) {
  const user = await createUser(`2${String(Date.now()).slice(-7)}`);
  return prisma.member.create({
    data: {
      userId: user.id,
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      ...over,
    },
  });
}

describe("the upload field registry", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists every column that can hold an upload filename", () => {
    expect(UPLOAD_FIELDS.map((f) => f.id)).toEqual([
      "member.photo",
      "member.paymentProof",
      "membership.paymentProof",
      "activityRegistration.paymentProof",
      "donation.proof",
      "payment.proof",
      "expense.proof",
      "activity.photo",
      "team.logo",
      "donation.donorPhoto",
      "payment.donorPhoto",
    ]);
  });

  it("serves through the generic route only what has no public route of its own", () => {
    const served = UPLOAD_FIELDS.filter((f) => f.locate).map((f) => f.id);
    expect(served).toEqual([
      "member.photo",
      "member.paymentProof",
      "membership.paymentProof",
      "activityRegistration.paymentProof",
      "donation.proof",
      "payment.proof",
      "expense.proof",
    ]);
  });

  it("finds the owner of a proof it serves", async () => {
    const member = await memberWith({ paymentProof: "proof.webp" });

    expect(await locateUpload("proof.webp")).toEqual({
      kind: "membership",
      ownerId: member.userId,
    });
  });

  it("answers nothing for a filename no column holds", async () => {
    expect(await locateUpload("nobody.webp")).toBeNull();
  });
});

describe("renameUpload", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("moves every reference and the fingerprint together", async () => {
    const member = await memberWith({ paymentProof: "old.png", photo: "old.png" });
    await prisma.expense.create({
      data: { label: "مصروف", amount: 10, proof: "old.png", createdBy: "admin" },
    });
    await prisma.proofImage.create({ data: { filename: "old.png", sha256: "oldhash" } });

    await renameUpload("old.png", "new.webp", "newhash");

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paymentProof).toBe("new.webp");
    expect(after.photo).toBe("new.webp");
    expect((await prisma.expense.findFirstOrThrow()).proof).toBe("new.webp");
    const fingerprint = await prisma.proofImage.findUniqueOrThrow({
      where: { filename: "new.webp" },
    });
    expect(fingerprint.sha256).toBe("newhash");
    expect(await prisma.proofImage.findUnique({ where: { filename: "old.png" } })).toBeNull();
  });

  it("leaves the fingerprint on the old name when a rename fails, so the next run retries", async () => {
    const member = await memberWith({ paymentProof: "old.png" });
    await prisma.proofImage.create({ data: { filename: "old.png", sha256: "oldhash" } });
    const broken = vi
      .spyOn(UPLOAD_FIELDS[6], "rename")
      .mockImplementation(
        () => prisma.proofImage.create({ data: { filename: "old.png", sha256: "clash" } }) as never,
      );

    await expect(renameUpload("old.png", "new.webp", "newhash")).rejects.toThrow();
    broken.mockRestore();

    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).paymentProof).toBe(
      "old.png",
    );
    expect(
      (await prisma.proofImage.findUniqueOrThrow({ where: { filename: "old.png" } })).sha256,
    ).toBe("oldhash");
  });
});
