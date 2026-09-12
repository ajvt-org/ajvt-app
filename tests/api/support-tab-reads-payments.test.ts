import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, post, createAdmin, signInAsAdmin, makeMember } from "./helpers";
import { GET as PROOFS } from "@/app/api/admin/payment-proofs/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";

const YEAR = runningYear();

async function giftRows() {
  const { proofs } = await (await PROOFS(get("/api/admin/payment-proofs"))).json();
  return (proofs as Record<string, unknown>[]).filter((row) => row.kind === "DONATION");
}

async function record(body: Record<string, unknown>) {
  const res = await RECORD(post("/api/admin/donations", body));
  expect(res.status).toBe(201);
  return (await res.json()).donation as { id: string };
}

describe("the support tab reads the gifts off the payments", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("holds a gift with the account and the bank reference it was recorded with", async () => {
    const account = await prisma.paymentAccount.findFirstOrThrow({
      where: { method: { name: "بنكيلي" } },
    });

    const gift = await record({
      donorName: "أحمد سالم",
      amount: 5000,
      paymentMethod: "بنكيلي",
      accountId: account.id,
      bankReference: "REF-1",
    });

    const rows = await giftRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: gift.id,
      amount: 5000,
      paymentMethod: "بنكيلي",
      accountId: account.id,
      bankReference: "REF-1",
      source: "PUBLIC",
    });
  });

  it("holds a gift aimed at an activity alongside one aimed at nothing", async () => {
    const activity = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });

    await record({ donorName: "أحمد", amount: 3000 });
    await record({ donorName: "سالم", amount: 7000, activityId: activity.id });

    const rows = await giftRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.activityTitle).sort()).toEqual([null, "القافلة الصحية"]);
  });

  it("leaves the money a member paid above the fee out of the gifts", async () => {
    await makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: MEMBERSHIP_FEE + 4000,
      membershipYear: YEAR,
    });

    expect(await giftRows()).toHaveLength(0);
  });

  it("hides the name on a gift from a supporter who asked to stay unnamed", async () => {
    const user = await prisma.user.create({
      data: { phone: "22110099", fullName: "سالم ولد محمد", supportNameConfidential: true },
    });
    await makeMember({
      userId: user.id,
      fullName: "سالم ولد محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });

    await record({ donorName: "سالم", amount: 2000, userId: user.id });

    const [row] = await giftRows();
    expect(row.donorName).toBeUndefined();
    expect(row.memberName).toBeUndefined();
    expect(row.amount).toBe(2000);
  });
});
