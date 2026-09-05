import { describe, it, expect, beforeEach } from "vitest";
import { GET as proofsRoute } from "@/app/api/admin/payment-proofs/route";
import { prisma } from "@/lib/prisma";
import { matchesAccount, NO_ACCOUNT } from "@/app/admin/payments/paymentsFilters";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";

async function anAccount(code: string) {
  const method = await prisma.paymentMethod.findFirstOrThrow({ where: { name: METHOD } });
  return prisma.paymentAccount.create({ data: { methodId: method.id, code, position: 1 } });
}

async function aMembership(accountId: string | null) {
  const user = await prisma.user.create({ data: { fullName: "عضو" } });
  await prisma.membership.create({
    data: {
      userId: user.id,
      year: 2026,
      status: "ACTIVE",
      paymentMethod: METHOD,
      accountId,
      paymentProof: "proof.jpg",
    },
  });
  return user.id;
}

async function proofs() {
  const res = await proofsRoute(get("/api/admin/payment-proofs"));
  return (await res.json()).proofs as {
    kind: string;
    userId?: string;
    accountId?: string | null;
  }[];
}

describe("filtering the payments list by the number that received the money", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("finds a membership paid into that number", async () => {
    const account = await anAccount("111111");
    await aMembership(account.id);

    const memberships = (await proofs()).filter((row) => row.kind === "MEMBERSHIP");

    expect(memberships).toHaveLength(1);
    expect(memberships.every((row) => matchesAccount(row, account.id))).toBe(true);
  });

  it("leaves it out of the numbers it was not paid into", async () => {
    const account = await anAccount("111111");
    const other = await anAccount("222222");
    await aMembership(account.id);

    const memberships = (await proofs()).filter((row) => row.kind === "MEMBERSHIP");

    expect(memberships.some((row) => matchesAccount(row, other.id))).toBe(false);
  });

  it("stops counting an attributed membership as having no number", async () => {
    const account = await anAccount("111111");
    await aMembership(account.id);

    const memberships = (await proofs()).filter((row) => row.kind === "MEMBERSHIP");

    expect(memberships.some((row) => matchesAccount(row, NO_ACCOUNT))).toBe(false);
  });

  it("still counts an unattributed membership as having no number", async () => {
    await aMembership(null);

    const memberships = (await proofs()).filter((row) => row.kind === "MEMBERSHIP");

    expect(memberships).toHaveLength(1);
    expect(memberships.every((row) => matchesAccount(row, NO_ACCOUNT))).toBe(true);
  });
});
