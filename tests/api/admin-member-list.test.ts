import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as LIST } from "@/app/api/admin/members/route";
import { GET as EXPORT } from "@/app/api/admin/export/[dataset]/route";
import { GET as PROOFS } from "@/app/api/admin/payment-proofs/route";
import {
  resetDb,
  get,
  createAdmin,
  signInAsAdmin,
  createUser,
  makeMember,
  withParams,
} from "./helpers";
import { runningYear } from "@/lib/membershipYear";

const YEAR = runningYear();

async function member(fullName: string, over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: YEAR,
    ...over,
  });
  return user;
}

const listed = async () => (await (await LIST(get("/api/admin/members"))).json()).members;

const exported = async () =>
  await (await EXPORT(get("/api/admin/export/members"), withParams({ dataset: "members" }))).text();

describe("the admin member list", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("puts what is waiting first, then what was accepted, then what was refused", async () => {
    await member("مرفوض", { status: "REJECTED" });
    await member("مقبول");
    await member("منتظر", { status: "PENDING" });

    expect((await listed()).map((m: { fullName: string }) => m.fullName)).toEqual([
      "منتظر",
      "مقبول",
      "مرفوض",
    ]);
  });

  it("reads a renewed member on the year they renewed into, once", async () => {
    const user = await member("مجدد", { membershipYear: YEAR - 1, paymentMethod: "بنكيلي" });
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE", paymentMethod: "مصرفي" },
    });

    const rows = await listed();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ membershipYear: YEAR, paymentMethod: "مصرفي" });
  });

  it("names the account, which the admin screens ask about by id", async () => {
    const user = await member("محمد");

    expect((await listed())[0].id).toBe(user.id);
  });

  it("exports a member once, on their newest year", async () => {
    const user = await member("مجدد", { membershipYear: YEAR - 1 });
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE", paymentMethod: "مصرفي" },
    });

    const csv = await exported();

    expect(csv.split("\n").filter((line) => line.includes("مجدد"))).toHaveLength(1);
    expect(csv).toContain("مصرفي");
  });
});

describe("the proofs waiting for an admin", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("shows the newest proof a member sent, once", async () => {
    const user = await member("مجدد", { membershipYear: YEAR - 1, paymentProof: "old.webp" });
    await prisma.membership.create({
      data: {
        userId: user.id,
        year: YEAR,
        status: "ACTIVE",
        paymentMethod: "بنكيلي",
        paymentProof: "new.webp",
      },
    });

    const { proofs } = await (await PROOFS(get("/api/admin/payment-proofs"))).json();
    const membership = proofs.filter((p: { kind: string }) => p.kind === "MEMBERSHIP");

    expect(membership).toHaveLength(1);
    expect(membership[0].proof).toBe("new.webp");
  });

  it("keeps the last proof a member sent when a later year carries none", async () => {
    const user = await member("توقف", { membershipYear: YEAR - 1, paymentProof: "old.webp" });
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE", paymentMethod: "بنكيلي" },
    });

    const { proofs } = await (await PROOFS(get("/api/admin/payment-proofs"))).json();

    expect(proofs.filter((p: { kind: string }) => p.kind === "MEMBERSHIP")[0].proof).toBe(
      "old.webp",
    );
  });

  it("leaves out a member who never sent one", async () => {
    await member("بدون إثبات");

    const { proofs } = await (await PROOFS(get("/api/admin/payment-proofs"))).json();

    expect(proofs.filter((p: { kind: string }) => p.kind === "MEMBERSHIP")).toEqual([]);
  });
});
