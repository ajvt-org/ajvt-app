import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { SUPER_ROLE } from "@/lib/adminRoles";
import { countUploadReferrers } from "@/lib/uploadFields";
import { releaseUploads } from "@/lib/uploadRelease";
import { thumbnailOf } from "@/lib/uploadNames";
import { findProofReuse } from "@/lib/proofReuse";
import {
  resetDb,
  createAdmin,
  signInAsAdmin,
  patch,
  del,
  withId,
  makeMember,
  giveGift,
} from "./helpers";

import {
  PATCH as DONATION_PATCH,
  DELETE as DONATION_DELETE,
} from "@/app/api/admin/donations/[id]/route";
import {
  PATCH as EXPENSE_PATCH,
  DELETE as EXPENSE_DELETE,
} from "@/app/api/admin/expenses/[id]/route";
import { PUT as MEMBER_PAYMENT } from "@/app/api/admin/members/[id]/payment/route";

const HASH = "a".repeat(64);
const ADMIN = { role: SUPER_ROLE };

let uploadDir: string;
const previousUploadDir = process.env.UPLOAD_DIR;

async function stored(filename: string, sha256 = HASH) {
  await prisma.proofImage.create({ data: { filename, sha256 } });
  await writeFile(join(uploadDir, filename), "image");
  await writeFile(join(uploadDir, thumbnailOf(filename)), "thumb");
  return filename;
}

const onDisk = (filename: string) => existsSync(join(uploadDir, filename));
const fingerprinted = (filename: string) =>
  prisma.proofImage.findUnique({ where: { filename } }).then(Boolean);

async function asSuper() {
  const admin = await createAdmin("super", "SUPER");
  await signInAsAdmin(admin);
  return admin;
}

beforeAll(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), "ajvt-proof-release-"));
  process.env.UPLOAD_DIR = uploadDir;
});

afterAll(async () => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  await rm(uploadDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetDb();
});

describe("letting go of an upload nothing names any more", () => {
  it("takes the fingerprint, the image and its thumbnail together", async () => {
    await stored("lonely.webp");

    await releaseUploads("lonely.webp");

    expect(await fingerprinted("lonely.webp")).toBe(false);
    expect(onDisk("lonely.webp")).toBe(false);
    expect(onDisk(thumbnailOf("lonely.webp"))).toBe(false);
  });

  it("keeps everything while a single record still names the file", async () => {
    await stored("held.webp");
    await prisma.expense.create({
      data: { label: "مصروف", amount: 10, proof: "held.webp", createdBy: "admin" },
    });

    await releaseUploads("held.webp");

    expect(await fingerprinted("held.webp")).toBe(true);
    expect(onDisk("held.webp")).toBe(true);
  });

  it("counts a referrer in any column, not only the one that let it go", async () => {
    await stored("shared.webp");
    const member = await makeMember({
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: MEMBERSHIP_FEE,
      photo: "shared.webp",
    });
    expect(member.userId).toBeTruthy();

    expect(await countUploadReferrers("shared.webp")).toBe(1);
    await releaseUploads("shared.webp");

    expect(await fingerprinted("shared.webp")).toBe(true);
    expect(onDisk("shared.webp")).toBe(true);
  });

  it("runs twice on the same name without complaining", async () => {
    await stored("twice.webp");

    await releaseUploads("twice.webp");
    await releaseUploads("twice.webp");

    expect(await fingerprinted("twice.webp")).toBe(false);
  });

  it("ignores what was never a name", async () => {
    await expect(releaseUploads(null, undefined, "")).resolves.toBeUndefined();
  });

  it("leaves a fingerprint held by another file alone", async () => {
    await stored("mine.webp");
    await stored("theirs.webp");
    await prisma.expense.create({
      data: { label: "مصروف", amount: 10, proof: "theirs.webp", createdBy: "admin" },
    });

    await releaseUploads("mine.webp");

    expect(await fingerprinted("mine.webp")).toBe(false);
    expect(await fingerprinted("theirs.webp")).toBe(true);
  });
});

describe("replacing the proof on a donation", () => {
  it("lets go of the picture it replaced", async () => {
    await asSuper();
    await stored("first.webp");
    await stored("second.webp");
    const donation = await giveGift({
      amount: 500,
      donorName: "زائر",
      status: "PENDING",
      proof: "first.webp",
    });

    const res = await DONATION_PATCH(
      patch(`/api/admin/donations/${donation.id}`, { proof: "second.webp" }),
      withId(donation.id),
    );
    expect(res.status).toBe(200);

    expect(await fingerprinted("first.webp")).toBe(false);
    expect(onDisk("first.webp")).toBe(false);
    expect(await fingerprinted("second.webp")).toBe(true);
    expect(onDisk("second.webp")).toBe(true);
  });

  it("stops the replacement being read back as a reuse", async () => {
    await asSuper();
    await stored("before.webp");
    await stored("after.webp");
    const donation = await giveGift({
      amount: 500,
      donorName: "زائر",
      status: "PENDING",
      proof: "before.webp",
    });

    await DONATION_PATCH(
      patch(`/api/admin/donations/${donation.id}`, { proof: "after.webp" }),
      withId(donation.id),
    );

    expect(await findProofReuse("after.webp", ADMIN)).toEqual([]);
  });

  it("still warns when another record sent the same picture", async () => {
    await asSuper();
    await stored("ours.webp");
    await stored("theirs.webp");
    await giveGift({ amount: 100, donorName: "آخر", proof: "theirs.webp" });
    const donation = await giveGift({
      amount: 500,
      donorName: "زائر",
      status: "PENDING",
      proof: "old.webp",
    });

    await DONATION_PATCH(
      patch(`/api/admin/donations/${donation.id}`, { proof: "ours.webp" }),
      withId(donation.id),
    );

    expect(await findProofReuse("ours.webp", ADMIN)).toHaveLength(1);
  });

  it("lets go of the proof when the donation goes", async () => {
    await asSuper();
    await stored("gone.webp");
    const donation = await giveGift({
      amount: 500,
      donorName: "زائر",
      status: "PENDING",
      proof: "gone.webp",
    });

    const res = await DONATION_DELETE(
      del(`/api/admin/donations/${donation.id}`),
      withId(donation.id),
    );
    expect(res.status).toBe(200);

    expect(await fingerprinted("gone.webp")).toBe(false);
    expect(onDisk("gone.webp")).toBe(false);
  });
});

describe("the proofs on an expense", () => {
  it("lets go of the one taken off and keeps the one still attached", async () => {
    await asSuper();
    await stored("kept.webp");
    await stored("dropped.webp");
    const expense = await prisma.expense.create({
      data: { label: "مصروف", amount: 100, proof: "kept.webp", createdBy: "super" },
    });
    await prisma.expenseProof.createMany({
      data: [
        { expenseId: expense.id, filename: "kept.webp" },
        { expenseId: expense.id, filename: "dropped.webp" },
      ],
    });

    const res = await EXPENSE_PATCH(
      patch(`/api/admin/expenses/${expense.id}`, { proofs: ["kept.webp"] }),
      withId(expense.id),
    );
    expect(res.status).toBe(200);

    expect(await fingerprinted("dropped.webp")).toBe(false);
    expect(onDisk("dropped.webp")).toBe(false);
    expect(await fingerprinted("kept.webp")).toBe(true);
    expect(onDisk("kept.webp")).toBe(true);
  });

  it("lets go of every proof when the expense goes", async () => {
    await asSuper();
    await stored("one.webp");
    await stored("two.webp");
    const expense = await prisma.expense.create({
      data: { label: "مصروف", amount: 100, proof: "one.webp", createdBy: "super" },
    });
    await prisma.expenseProof.createMany({
      data: [
        { expenseId: expense.id, filename: "one.webp" },
        { expenseId: expense.id, filename: "two.webp" },
      ],
    });

    const res = await EXPENSE_DELETE(del(`/api/admin/expenses/${expense.id}`), withId(expense.id));
    expect(res.status).toBe(200);

    expect(await fingerprinted("one.webp")).toBe(false);
    expect(await fingerprinted("two.webp")).toBe(false);
    expect(onDisk("one.webp")).toBe(false);
    expect(onDisk("two.webp")).toBe(false);
  });
});

describe("correcting the proof on a membership fee", () => {
  it("lets go of the picture it replaced", async () => {
    await asSuper();
    await stored("was.webp");
    await stored("now.webp");
    const member = await makeMember({
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "PENDING",
      paidAmount: MEMBERSHIP_FEE,
      paymentProof: "was.webp",
    });

    const res = await MEMBER_PAYMENT(
      patch(`/api/admin/members/${member.userId}/payment`, { paymentProof: "now.webp" }),
      withId(member.userId),
    );
    expect(res.status).toBe(200);

    expect(await fingerprinted("was.webp")).toBe(false);
    expect(onDisk("was.webp")).toBe(false);
    expect(await fingerprinted("now.webp")).toBe(true);
  });
});
