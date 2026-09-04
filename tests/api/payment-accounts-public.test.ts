import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/payment-methods/route";
import { prisma } from "@/lib/prisma";
import { payableMethodNames } from "@/lib/paymentMethodsServer";
import { resetDb, get } from "./helpers";

const WITH_A_CODE = "بنكيلي";
const CASH = "نقداً";

type Offered = {
  name: string;
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

  it("never lists a method reserved for the admin", async () => {
    expect(named(await offered(), CASH)).toBeUndefined();
  });

  it("leaves out a method with no account to receive into", async () => {
    await prisma.paymentAccount.deleteMany();
    expect(await offered()).toEqual([]);
  });

  it("leaves out a method whose account is closed at the bank", async () => {
    await prisma.paymentAccount.updateMany({ data: { closedAt: new Date() } });
    expect(named(await offered(), WITH_A_CODE)).toBeUndefined();
  });

  it("leaves out a method whose account the admin switched off", async () => {
    await prisma.paymentAccount.updateMany({ data: { active: false } });
    expect(named(await offered(), WITH_A_CODE)).toBeUndefined();
  });

  it("shows a new code without a deploy", async () => {
    const method = await prisma.paymentMethod.create({
      data: { name: "خدمة جديدة", memberFacing: true, active: true, position: 9 },
    });
    await prisma.paymentAccount.create({
      data: { methodId: method.id, code: "999999", position: 1 },
    });
    expect(named(await offered(), "خدمة جديدة")?.accounts.map((a) => a.code)).toEqual(["999999"]);
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

describe("what a member may pay with", () => {
  const NEW_METHOD = "خدمة جديدة";

  beforeEach(async () => {
    await resetDb();
  });

  async function aMethodWithNoAccount() {
    return prisma.paymentMethod.create({
      data: { name: NEW_METHOD, memberFacing: true, active: true, position: 9 },
    });
  }

  it("leaves out a method an admin created but gave no code", async () => {
    await aMethodWithNoAccount();
    expect(await payableMethodNames()).not.toContain(NEW_METHOD);
  });

  it("takes the same method once a code is typed into it", async () => {
    const method = await aMethodWithNoAccount();
    await prisma.paymentAccount.create({
      data: { methodId: method.id, code: "999999", position: 1 },
    });
    expect(await payableMethodNames()).toContain(NEW_METHOD);
  });

  it("leaves out the method paid in person, which has no account to receive into", async () => {
    expect(await payableMethodNames()).not.toContain(CASH);
  });

  it("drops a method whose only account is closed at the bank", async () => {
    const before = await payableMethodNames();
    await prisma.paymentAccount.updateMany({ data: { closedAt: new Date() } });
    const after = await payableMethodNames();
    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual([]);
  });
});
