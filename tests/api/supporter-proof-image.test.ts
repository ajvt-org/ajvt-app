import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import {
  resetDb,
  get,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withParams,
  makeMember,
} from "./helpers";
import { clearCookies } from "./cookieJar";

import { GET as FILE } from "@/app/api/files/[filename]/route";
import { GET as DONOR_PHOTO } from "@/app/api/files/donation/[filename]/route";

const GIVER = "الكريم ولد الساتر";
const SLIP = "confidential-slip.webp";
const OPEN_SLIP = "ordinary-slip.webp";
const SENDER = "confidential-sender.webp";

let uploadDir: string;
const previousUploadDir = process.env.UPLOAD_DIR;

beforeAll(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), "ajvt-confidential-files-"));
  process.env.UPLOAD_DIR = uploadDir;
  await Promise.all(
    [SLIP, OPEN_SLIP, SENDER].map((name) => writeFile(join(uploadDir, name), name)),
  );
});

afterAll(async () => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  await rm(uploadDir, { recursive: true, force: true });
});

async function marked() {
  const user = await createUser("44001122");
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: true },
  });
}

const fetchFile = (filename: string) =>
  FILE(get(`/api/files/${filename}`), withParams({ filename }));

const fetchDonorPhoto = (filename: string) =>
  DONOR_PHOTO(get(`/api/files/donation/${filename}`), withParams({ filename }));

describe("the proof image of a confidential supporter", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is refused to a full access admin", async () => {
    const giver = await marked();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "ACTIVE", userId: giver.id, proof: SLIP },
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await fetchFile(SLIP)).status).toBe(404);
  });

  it("is served to the role that holds the promise", async () => {
    const giver = await marked();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "ACTIVE", userId: giver.id, proof: SLIP },
    });
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    expect((await fetchFile(SLIP)).status).toBe(200);
  });

  it("is served to him", async () => {
    const giver = await marked();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "ACTIVE", userId: giver.id, proof: SLIP },
    });
    clearCookies();
    await signInAs(giver);

    expect((await fetchFile(SLIP)).status).toBe(200);
  });

  it("is refused to another signed in member", async () => {
    const giver = await marked();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, status: "ACTIVE", userId: giver.id, proof: SLIP },
    });
    const other = await createUser("44009988");
    clearCookies();
    await signInAs(other);

    expect((await fetchFile(SLIP)).status).toBe(404);
  });

  it("is refused when it backs a membership payment carrying a surplus", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paymentProof: SLIP,
      paidAmount: MEMBERSHIP_FEE + 4900,
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await fetchFile(SLIP)).status).toBe(404);
  });

  it("is served when his membership payment stops at the fee", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paymentProof: SLIP,
      paidAmount: MEMBERSHIP_FEE,
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await fetchFile(SLIP)).status).toBe(200);
  });

  it("keeps his sender photo off the public route", async () => {
    const giver = await marked();
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 5000,
        status: "ACTIVE",
        userId: giver.id,
        donorPhoto: SENDER,
      },
    });

    expect((await fetchDonorPhoto(SENDER)).status).toBe(404);
  });

  it("serves the proof of a giver who is not marked as before", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 5000,
        status: "ACTIVE",
        userId: plain.id,
        proof: OPEN_SLIP,
      },
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await fetchFile(OPEN_SLIP)).status).toBe(200);
  });

  it("serves the sender photo of a giver who is not marked as before", async () => {
    const plain = await createUser("44003344");
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 5000,
        status: "ACTIVE",
        userId: plain.id,
        donorPhoto: SENDER,
      },
    });

    expect((await fetchDonorPhoto(SENDER)).status).toBe(200);
  });
});
