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

  it("is kept when the member edits a request and the number has since closed", async () => {
    const account = await openAccountOn(PAYABLE);
    await prisma.paymentAccount.create({
      data: { methodId: account.methodId, code: "888888", position: 2 },
    });
    const created = await submitWith(PAYABLE, account.id);
    const { id } = await created.json();
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date(), active: false },
    });

    const res = await REGISTER(
      post("/api/members", {
        ...submission,
        id,
        paymentMethod: PAYABLE,
        accountId: account.id,
      }),
    );

    expect(res.status).toBe(200);
    expect((await prisma.membership.findFirstOrThrow({ where: { userId: id } })).accountId).toBe(
      account.id,
    );
  });

  it("is still refused when a member edits onto a number they never held", async () => {
    const account = await openAccountOn(PAYABLE);
    const closed = await prisma.paymentAccount.create({
      data: { methodId: account.methodId, code: "888888", position: 2, closedAt: new Date() },
    });
    const created = await submitWith(PAYABLE, account.id);
    const { id } = await created.json();

    const res = await REGISTER(
      post("/api/members", { ...submission, id, paymentMethod: PAYABLE, accountId: closed.id }),
    );

    expect(res.status).toBe(400);
  });
});

describe("the transaction number a member copies off their receipt", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAs(await createUser());
  });

  async function submitWithReference(bankReference: unknown) {
    return REGISTER(post("/api/members", { ...submission, paymentMethod: PAYABLE, bankReference }));
  }

  it("is kept on the membership and reaches the unified table", async () => {
    expect((await submitWithReference("TR10000000001")).status).toBe(201);

    const membership = await prisma.membership.findFirstOrThrow();
    expect(membership.bankReference).toBe("TR10000000001");
    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.bankReference).toBe("TR10000000001");
  });

  it("drops the spaces a member grouped it with", async () => {
    await submitWithReference("TR 100 000 000 01");
    expect((await prisma.membership.findFirstOrThrow()).bankReference).toBe("TR10000000001");
  });

  it("may be left out entirely", async () => {
    expect((await submitWithReference(null)).status).toBe(201);
    expect((await prisma.membership.findFirstOrThrow()).bankReference).toBeNull();
  });

  it("is taken even when it does not look like one, since the screen only warns", async () => {
    expect((await submitWithReference("AJV-EG8A6")).status).toBe(201);
    expect((await prisma.membership.findFirstOrThrow()).bankReference).toBe("AJV-EG8A6");
  });

  it("refuses one longer than a reference could be", async () => {
    expect((await submitWithReference("1".repeat(60))).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("sits beside the order code without replacing it", async () => {
    await REGISTER(
      post("/api/members", {
        ...submission,
        paymentMethod: PAYABLE,
        referenceCode: "AJ-EG8A6",
        bankReference: "TR10000000001",
      }),
    );

    const membership = await prisma.membership.findFirstOrThrow();
    expect(membership.referenceCode).toBe("AJ-EG8A6");
    expect(membership.bankReference).toBe("TR10000000001");
  });
});
