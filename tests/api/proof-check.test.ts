import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { readdir, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/admin/proof-check/route";
import { processImage } from "@/lib/imageProcessing";
import { proofHash } from "@/lib/proofHash";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, postForm, createAdmin, signInAsAdmin, makeMember } from "./helpers";

let uploadDir: string;

async function picture(hue: number): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: hue, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
}

function fileOf(bytes: Buffer, name = "proof.png"): FormData {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], name, { type: "image/png" }));
  return form;
}

function check(form: FormData) {
  return POST(postForm("/api/admin/proof-check", form));
}

beforeAll(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), "proof-check-"));
  vi.stubEnv("UPLOAD_DIR", uploadDir);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(uploadDir, { recursive: true, force: true });
});

describe("POST /api/admin/proof-check", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await check(fileOf(await picture(10)));

    expect(res.status).toBe(401);
  });

  it("refuses a role that cannot open the payments area", async () => {
    await signInAsAdmin(await createAdmin("quizzer", "QUIZ"));

    const res = await check(fileOf(await picture(10)));

    expect(res.status).toBe(403);
  });

  it("says nothing carries the image when nothing does", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await check(fileOf(await picture(20)));

    expect(res.status).toBe(200);
    expect((await res.json()).reuse).toEqual([]);
  });

  it("names the record already holding that exact file", async () => {
    await signInAsAdmin(await createAdmin());
    const bytes = await picture(30);
    const processed = await processImage(bytes);
    await prisma.proofImage.create({
      data: { filename: "held.webp", sha256: proofHash(processed.full) },
    });
    const member = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "PENDING",
      paidAmount: MEMBERSHIP_FEE,
      paymentProof: "held.webp",
    });

    const res = await check(fileOf(bytes));

    const { reuse } = await res.json();
    expect(reuse).toHaveLength(1);
    expect(reuse[0]).toMatchObject({ kind: "member", id: member.userId });
  });

  it("keeps a different picture apart", async () => {
    await signInAsAdmin(await createAdmin());
    const processed = await processImage(await picture(40));
    await prisma.proofImage.create({
      data: { filename: "held.webp", sha256: proofHash(processed.full) },
    });

    const res = await check(fileOf(await picture(200)));

    expect((await res.json()).reuse).toEqual([]);
  });

  it("saves nothing, whatever the answer", async () => {
    await signInAsAdmin(await createAdmin());
    const bytes = await picture(50);
    const processed = await processImage(bytes);
    await prisma.proofImage.create({
      data: { filename: "held.webp", sha256: proofHash(processed.full) },
    });
    const before = await prisma.proofImage.count();
    const filesBefore = await readdir(uploadDir);

    await check(fileOf(bytes));
    await check(fileOf(await picture(220)));

    expect(await prisma.proofImage.count()).toBe(before);
    expect(await readdir(uploadDir)).toEqual(filesBefore);
  });

  it("refuses a file that is not an image it reads", async () => {
    await signInAsAdmin(await createAdmin());
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "note.txt", { type: "text/plain" }));

    const res = await check(form);

    expect(res.status).toBe(400);
  });

  it("refuses a call with no file on it", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await check(new FormData());

    expect(res.status).toBe(400);
  });
});
