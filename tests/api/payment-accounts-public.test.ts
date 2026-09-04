import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/payment-methods/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get } from "./helpers";

const WITH_A_CODE = "بنكيلي";
const CASH = "نقداً";

type Offered = {
  name: string;
  memberFacing: boolean;
  accounts: { id: string; code: string; label: string | null }[];
};

async function offered(): Promise<Offered[]> {
  const res = await GET(get("/api/payment-methods"));
  return (await res.json()).methods;
}

function named(methods: Offered[], name: string) {
  return methods.find((method) => method.name === name);
}

describe("the accounts the payment methods route serves", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries the open account of a method that has one", async () => {
    const method = named(await offered(), WITH_A_CODE);
    expect(method?.accounts).toHaveLength(1);
    expect(method?.accounts[0].code).toBeTruthy();
  });

  it("gives a method with no account an empty list", async () => {
    expect(named(await offered(), CASH)?.accounts).toEqual([]);
  });

  it("leaves out an account closed at the bank", async () => {
    await prisma.paymentAccount.updateMany({ data: { closedAt: new Date() } });
    expect(named(await offered(), WITH_A_CODE)?.accounts).toEqual([]);
  });

  it("leaves out an account the admin switched off", async () => {
    await prisma.paymentAccount.updateMany({ data: { active: false } });
    expect(named(await offered(), WITH_A_CODE)?.accounts).toEqual([]);
  });

  it("shows a new code without a deploy", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: CASH } });
    await prisma.paymentAccount.create({
      data: { methodId: method.id, code: "999999", position: 1 },
    });
    expect(named(await offered(), CASH)?.accounts.map((a) => a.code)).toEqual(["999999"]);
  });

  it("orders several open accounts by position", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: WITH_A_CODE } });
    await prisma.paymentAccount.create({
      data: { methodId: method.id, code: "888888", position: 2 },
    });
    const codes = named(await offered(), WITH_A_CODE)?.accounts.map((a) => a.code) ?? [];
    expect(codes).toHaveLength(2);
    expect(codes[1]).toBe("888888");
  });
});
