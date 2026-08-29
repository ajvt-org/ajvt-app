import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { receiptsForAccount } from "@/lib/receiptsServer";
import { resetDb, createUsers, makeMember } from "./helpers";

async function aPerson(name: string) {
  const [user] = await createUsers(1);
  const member = await makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
  return { user, member };
}

async function aReceipt(over: Record<string, unknown>) {
  return prisma.receipt.create({
    data: {
      number: `R-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      token: `t${Math.random().toString(36).slice(2)}`,
      payerName: "محمد ولد أحمد",
      reason: "اشتراك",
      amount: 1000,
      issuedOn: new Date(2026, 5, 1),
      issuedBy: "الرابطة",
      ...over,
    },
  });
}

describe("the receipts a person can see", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("finds one carrying only the account", async () => {
    const { user } = await aPerson("محمد ولد أحمد");
    await aReceipt({ userId: user.id });

    expect(await receiptsForAccount(user.id)).toHaveLength(1);
  });

  it("finds one carrying both the account and the membership row", async () => {
    const { user, member } = await aPerson("أحمد سالم");
    await aReceipt({ userId: user.id, memberId: member.id });

    expect(await receiptsForAccount(user.id)).toHaveLength(1);
  });

  it("leaves out one that names no account, whoever it names otherwise", async () => {
    const { user, member } = await aPerson("أحمد سالم");
    await aReceipt({ memberId: member.id });

    expect(await receiptsForAccount(user.id)).toEqual([]);
  });

  it("does not hand over someone else's", async () => {
    const mine = await aPerson("سالم ولد محمد");
    const theirs = await aPerson("عبد الله ولد سالم");
    await aReceipt({ userId: theirs.user.id });

    expect(await receiptsForAccount(mine.user.id)).toEqual([]);
  });

  it("leaves out a withdrawn receipt", async () => {
    const { user } = await aPerson("محمد الأمين");
    await aReceipt({ userId: user.id, status: "VOID" });

    expect(await receiptsForAccount(user.id)).toEqual([]);
  });

  it("gathers every receipt the account carries", async () => {
    const { user, member } = await aPerson("اباه ولد محمد");
    await aReceipt({ userId: user.id });
    await aReceipt({ userId: user.id, memberId: member.id });

    expect(await receiptsForAccount(user.id)).toHaveLength(2);
  });
});
