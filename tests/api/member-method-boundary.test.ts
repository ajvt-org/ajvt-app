import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs } from "./helpers";

const PAYABLE = "بنكيلي";
const ADMIN_ONLY = "نقداً";
const INVENTED = "طريقة لا وجود لها";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentProof: "proof.webp",
  paidAmount: 2100,
};

async function submitWith(paymentMethod: string, accountId?: string) {
  return REGISTER(post("/api/members", { ...submission, paymentMethod, accountId }));
}

async function openAccountOn(name: string) {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name } });
  return prisma.paymentAccount.findFirstOrThrow({ where: { methodId: method.id } });
}

describe("the method a member may submit", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAs(await createUser());
  });

  it("takes one the member is offered", async () => {
    expect((await submitWith(PAYABLE)).status).toBe(201);
    expect(await prisma.membership.count()).toBe(1);
  });

  it("refuses the method reserved for the admin", async () => {
    expect((await submitWith(ADMIN_ONLY)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a method an admin stopped", async () => {
    await prisma.paymentMethod.update({ where: { name: PAYABLE }, data: { active: false } });
    expect((await submitWith(PAYABLE)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a method with no account to receive into", async () => {
    await prisma.paymentAccount.deleteMany();
    expect((await submitWith(PAYABLE)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a name nobody ever offered", async () => {
    expect((await submitWith(INVENTED)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("leaves nothing behind in the unified table when it refuses", async () => {
    await submitWith(ADMIN_ONLY);
    expect(await prisma.payment.count()).toBe(0);
  });
});

describe("the account a member says they paid into", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAs(await createUser());
  });

  it("is kept on the membership", async () => {
    const account = await openAccountOn(PAYABLE);
    expect((await submitWith(PAYABLE, account.id)).status).toBe(201);
    const membership = await prisma.membership.findFirstOrThrow();
    expect(membership.accountId).toBe(account.id);
  });

  it("reaches the unified table through the mirror", async () => {
    const account = await openAccountOn(PAYABLE);
    await submitWith(PAYABLE, account.id);
    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.accountId).toBe(account.id);
  });

  it("may be left out, and the record then says so", async () => {
    expect((await submitWith(PAYABLE)).status).toBe(201);
    const membership = await prisma.membership.findFirstOrThrow();
    expect(membership.accountId).toBeNull();
  });

  it("is refused when it belongs to another method", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: "السداد" } });
    const elsewhere = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    expect((await submitWith(PAYABLE, elsewhere.id)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("is refused when it has been closed at the bank", async () => {
    const account = await openAccountOn(PAYABLE);
    await prisma.paymentAccount.create({
      data: { methodId: account.methodId, code: "888888", position: 2 },
    });
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date() },
    });

    expect((await submitWith(PAYABLE, account.id)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("is refused when it is not an account at all", async () => {
    expect((await submitWith(PAYABLE, "not-an-account")).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });
});
