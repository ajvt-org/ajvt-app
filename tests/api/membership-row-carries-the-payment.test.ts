import { describe, it, expect, beforeEach } from "vitest";
import { GET as proofsRoute } from "@/app/api/admin/payment-proofs/route";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, get, createAdmin, signInAsAdmin, makeMember } from "./helpers";

const YEAR = runningYear();

async function membershipRow() {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: 2000,
    paymentProof: "proof.webp",
    membershipYear: YEAR,
  });
}

async function rows() {
  const { proofs } = await (await proofsRoute(get("/api/admin/payment-proofs"))).json();
  return (proofs as Record<string, unknown>[]).filter((r) => r.kind === "MEMBERSHIP");
}

describe("what a membership row on the payments screen carries", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("carries the amount that was paid", async () => {
    await membershipRow();

    const [row] = await rows();

    expect(row.amount).toBe(2000);
  });

  it("carries the method and the account the payment holds", async () => {
    const m = await membershipRow();
    const account = await prisma.paymentAccount.findFirstOrThrow({ include: { method: true } });
    await prisma.payment.updateMany({
      where: { userId: m.userId, purpose: "MEMBERSHIP" },
      data: { method: account.method.name, accountId: account.id },
    });

    const [row] = await rows();

    expect(row.paymentMethod).toBe(account.method.name);
    expect(row.accountId).toBe(account.id);
  });
});
