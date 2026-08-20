import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { GET } from "@/app/api/files/[filename]/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  get,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withParams,
} from "./helpers";
import { clearCookies } from "./cookieJar";

let uploadDir: string;
const previousUploadDir = process.env.UPLOAD_DIR;

const FILES = [
  "member-proof.webp",
  "member-proof-thumb.webp",
  "other-proof.webp",
  "membership-proof.webp",
  "registration-proof.webp",
  "donation-proof.webp",
  "payment-proof.webp",
  "expense-proof.webp",
  "headshot.webp",
];

beforeAll(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), "ajvt-files-"));
  process.env.UPLOAD_DIR = uploadDir;
  await Promise.all(FILES.map((name) => writeFile(join(uploadDir, name), name)));
});

afterAll(async () => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  await rm(uploadDir, { recursive: true, force: true });
});

async function memberFor(user: { id: string }, over: Record<string, unknown> = {}) {
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

const fetchFile = (filename: string) =>
  GET(get(`/api/files/${filename}`), withParams({ filename }));

async function seedEverything() {
  const [owner, other] = [await createUser("22000001"), await createUser("22000002")];
  const mine = await memberFor(owner, {
    paymentProof: "member-proof.webp",
    photo: "headshot.webp",
  });
  await memberFor(other, { paymentProof: "other-proof.webp" });
  await prisma.membership.create({
    data: { memberId: mine.id, year: 2026, paymentProof: "membership-proof.webp" },
  });
  const activity = await prisma.activity.create({ data: { title: "نشاط", description: "وصف" } });
  await prisma.activityRegistration.create({
    data: { memberId: mine.id, activityId: activity.id, paymentProof: "registration-proof.webp" },
  });
  await prisma.donation.create({ data: { proof: "donation-proof.webp", amount: 100 } });
  await prisma.payment.create({
    data: { purpose: "MEMBERSHIP", amount: 100, proof: "payment-proof.webp", memberId: mine.id },
  });
  await prisma.expense.create({
    data: { label: "مصروف", amount: 50, proof: "expense-proof.webp", createdBy: "admin" },
  });
  return { owner, other };
}

describe("GET /api/files/[filename]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a request with no session at all", async () => {
    await seedEverything();
    expect((await fetchFile("member-proof.webp")).status).toBe(401);
  });

  it("hides another member's payment proof behind a 404, not a 403", async () => {
    const { other } = await seedEverything();
    await signInAs(other);

    expect((await fetchFile("member-proof.webp")).status).toBe(404);
  });

  it("serves a member their own proof, full size and thumbnail", async () => {
    const { owner } = await seedEverything();
    await signInAs(owner);

    const full = await fetchFile("member-proof.webp");
    expect(full.status).toBe(200);
    expect(full.headers.get("cache-control")).toContain("private");
    expect((await fetchFile("member-proof-thumb.webp")).status).toBe(200);
  });

  it("hides a filename no record references, even from its owner's session", async () => {
    const { owner } = await seedEverything();
    await signInAs(owner);
    await writeFile(join(uploadDir, "orphan.webp"), "orphan");

    expect((await fetchFile("orphan.webp")).status).toBe(404);
  });

  it("serves every kind to an unscoped SUPER admin", async () => {
    await seedEverything();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    for (const file of [
      "member-proof.webp",
      "membership-proof.webp",
      "registration-proof.webp",
      "donation-proof.webp",
      "payment-proof.webp",
      "expense-proof.webp",
      "headshot.webp",
    ]) {
      expect((await fetchFile(file)).status, file).toBe(200);
    }
  });

  it("keeps a MEMBERS admin out of activity proofs and an ACTIVITIES admin out of membership proofs", async () => {
    await seedEverything();

    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
    expect((await fetchFile("membership-proof.webp")).status).toBe(200);
    expect((await fetchFile("registration-proof.webp")).status).toBe(404);
    expect((await fetchFile("donation-proof.webp")).status).toBe(404);

    clearCookies();
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));
    expect((await fetchFile("registration-proof.webp")).status).toBe(200);
    expect((await fetchFile("membership-proof.webp")).status).toBe(404);
  });

  it("serves a member photo to any signed-in account, as the public member route already does", async () => {
    const { other } = await seedEverything();
    await signInAs(other);

    expect((await fetchFile("headshot.webp")).status).toBe(200);
  });

  it("still blocks path traversal", async () => {
    const { owner } = await seedEverything();
    await signInAs(owner);

    const res = await GET(get("/api/files/x"), withParams({ filename: "../headshot.webp" }));
    expect(res.status).toBe(404);
  });
});
