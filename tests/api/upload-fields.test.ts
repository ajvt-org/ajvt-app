import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { UPLOAD_FIELDS, locateUpload, renameUpload } from "@/lib/uploadFields";
import type { PublicFileRoute } from "@/lib/uploadFields";
import { resetDb, createUser, get, withParams, personFor, makeMember } from "./helpers";

import { GET as ACTIVITY_FILE } from "@/app/api/files/activity/[filename]/route";
import { GET as DONATION_FILE } from "@/app/api/files/donation/[filename]/route";
import { GET as MEMBER_FILE } from "@/app/api/files/member/[filename]/route";
import { GET as TEAM_FILE } from "@/app/api/files/team/[filename]/route";

async function memberWith(over: Record<string, unknown>) {
  const user = await createUser(`2${String(Date.now()).slice(-7)}`);
  return makeMember({
    userId: user.id,
    fullName: "عضو",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    ...over,
  });
}

describe("the upload field registry", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists every column that can hold an upload filename", () => {
    expect(UPLOAD_FIELDS.map((f) => f.id)).toEqual([
      "user.photo",
      "membership.paymentProof",
      "activityRegistration.paymentProof",
      "donation.proof",
      "payment.proof",
      "expense.proof",
      "expenseProof.filename",
      "activity.photo",
      "team.logo",
      "donation.donorPhoto",
      "payment.donorPhoto",
    ]);
  });

  it("serves through the generic route only what has no public route of its own", () => {
    const served = UPLOAD_FIELDS.filter((f) => f.serve.via === "authenticated").map((f) => f.id);
    expect(served).toEqual([
      "user.photo",
      "membership.paymentProof",
      "activityRegistration.paymentProof",
      "donation.proof",
      "payment.proof",
      "expense.proof",
      "expenseProof.filename",
    ]);
  });

  it("finds the owner of a proof it serves", async () => {
    const member = await memberWith({ paymentProof: "proof.webp" });

    expect(await locateUpload("proof.webp")).toEqual({
      kind: "membership",
      confidential: false,
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

    const after = await prisma.membership.findFirstOrThrow({ where: { userId: member.userId } });
    expect(after.paymentProof).toBe("new.webp");
    expect((await personFor(member.id)).photo).toBe("new.webp");
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

    expect(
      (await prisma.membership.findFirstOrThrow({ where: { userId: member.userId } })).paymentProof,
    ).toBe("old.png");
    expect(
      (await prisma.proofImage.findUniqueOrThrow({ where: { filename: "old.png" } })).sha256,
    ).toBe("oldhash");
  });
});

const ROUTE_HANDLERS: Record<PublicFileRoute, typeof DONATION_FILE> = {
  "/api/files/activity": ACTIVITY_FILE,
  "/api/files/donation": DONATION_FILE,
  "/api/files/member": MEMBER_FILE,
  "/api/files/team": TEAM_FILE,
};

const ROWS: Record<string, (filename: string) => Promise<unknown>> = {
  "activity.photo": (photo) =>
    prisma.activity.create({ data: { title: "نشاط", description: "وصف", photo } }),
  "team.logo": async (logo) => {
    const activity = await prisma.activity.create({ data: { title: "بطولة", description: "وصف" } });
    return prisma.team.create({ data: { activityId: activity.id, name: "فريق", logo } });
  },
  "donation.donorPhoto": (donorPhoto) =>
    prisma.donation.create({ data: { amount: 100, donorName: "زائر", donorPhoto } }),
  "payment.donorPhoto": (donorPhoto) =>
    prisma.payment.create({
      data: { purpose: "DONATION", amount: 100, donorName: "زائر", donorPhoto, status: "ACTIVE" },
    }),
};

const publicRouteFields = UPLOAD_FIELDS.filter((f) => f.serve.via === "public-route");

describe("a field the generic route does not resolve", () => {
  let uploadDir: string;
  const previousUploadDir = process.env.UPLOAD_DIR;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), "ajvt-upload-fields-"));
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

  it("names a route that exists", () => {
    for (const field of publicRouteFields) {
      if (field.serve.via !== "public-route") continue;
      expect(existsSync(`src/app${field.serve.route}/[filename]/route.ts`), field.id).toBe(true);
    }
  });

  it("is covered here, so a new one cannot be added without checking its route", () => {
    expect(publicRouteFields.map((f) => f.id).sort()).toEqual(Object.keys(ROWS).sort());
  });

  it.each(publicRouteFields.map((f) => [f.id] as const))(
    "%s is served by the route it names",
    async (id) => {
      const field = UPLOAD_FIELDS.find((f) => f.id === id)!;
      if (field.serve.via !== "public-route") throw new Error(`${id} names no route`);
      const filename = `${id.replace(".", "-")}.webp`;
      await ROWS[id](filename);
      await writeFile(join(uploadDir, filename), filename);

      const res = await ROUTE_HANDLERS[field.serve.route](
        get(`${field.serve.route}/${filename}`),
        withParams({ filename }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toContain("public");
    },
  );

  it.each(publicRouteFields.map((f) => [f.id] as const))(
    "%s route hides a filename no row carries",
    async (id) => {
      const field = UPLOAD_FIELDS.find((f) => f.id === id)!;
      if (field.serve.via !== "public-route") throw new Error(`${id} names no route`);
      await writeFile(join(uploadDir, "orphan.webp"), "orphan");

      const res = await ROUTE_HANDLERS[field.serve.route](
        get(`${field.serve.route}/orphan.webp`),
        withParams({ filename: "orphan.webp" }),
      );

      expect(res.status).toBe(404);
    },
  );
});
