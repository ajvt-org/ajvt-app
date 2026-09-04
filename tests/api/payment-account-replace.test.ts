import { describe, it, expect, beforeEach } from "vitest";
import { POST as REPLACE } from "@/app/api/admin/payment-methods/[id]/accounts/[accountId]/replace/route";
import { GET as adminList } from "@/app/api/admin/payment-methods/[id]/accounts/route";
import { GET as publicList } from "@/app/api/payment-methods/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, get, createAdmin, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";
const NEW_CODE = "555555";

async function theMethod() {
  return prisma.paymentMethod.findUniqueOrThrow({ where: { name: METHOD } });
}

async function itsAccount(methodId: string) {
  return prisma.paymentAccount.findFirstOrThrow({ where: { methodId, closedAt: null } });
}

function onAccount(id: string, accountId: string) {
  return { params: Promise.resolve({ id, accountId }) };
}

async function replace(id: string, accountId: string, body: unknown) {
  return REPLACE(
    post(`/api/admin/payment-methods/${id}/accounts/${accountId}/replace`, body),
    onAccount(id, accountId),
  );
}

async function moneyOn(accountId: string) {
  const [payments, memberships, donations, expenses] = await Promise.all([
    prisma.payment.findMany({ where: { accountId }, select: { id: true } }),
    prisma.membership.findMany({ where: { accountId }, select: { id: true } }),
    prisma.donation.findMany({ where: { accountId }, select: { id: true } }),
    prisma.expense.findMany({ where: { accountId }, select: { id: true } }),
  ]);
  return [...payments, ...memberships, ...donations, ...expenses].map((row) => row.id).sort();
}

describe("replacing the number a method receives into", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("closes the old number and opens a new one, as two rows", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);

    const res = await replace(method.id, old.id, { code: NEW_CODE });
    expect(res.status).toBe(201);

    const closed = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: old.id } });
    expect(closed.closedAt).not.toBeNull();
    expect(closed.active).toBe(false);
    expect(closed.code).toBe(old.code);

    const opened = await prisma.paymentAccount.findFirstOrThrow({ where: { code: NEW_CODE } });
    expect(opened.methodId).toBe(method.id);
    expect(opened.closedAt).toBeNull();
  });

  it("leaves every money row exactly where it was", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 5000, accountId: old.id },
    });
    await prisma.expense.create({
      data: { label: "إيجار الملعب", amount: 1200, createdBy: "admin", accountId: old.id },
    });
    const before = await moneyOn(old.id);

    await replace(method.id, old.id, { code: NEW_CODE });

    expect(await moneyOn(old.id)).toEqual(before);
    expect(before).toHaveLength(2);
    const opened = await prisma.paymentAccount.findFirstOrThrow({ where: { code: NEW_CODE } });
    expect(await moneyOn(opened.id)).toEqual([]);
  });

  it("changes nothing at all when the new number is already taken", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    const taken = await prisma.paymentAccount.create({
      data: { methodId: method.id, code: NEW_CODE, position: 2 },
    });

    const res = await replace(method.id, old.id, { code: NEW_CODE });

    expect(res.status).toBe(409);
    expect(
      (await prisma.paymentAccount.findUniqueOrThrow({ where: { id: old.id } })).closedAt,
    ).toBeNull();
    expect(await prisma.paymentAccount.count({ where: { methodId: method.id } })).toBe(2);
    expect(taken.id).toBeTruthy();
  });

  it("refuses the number it already is", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);

    expect((await replace(method.id, old.id, { code: old.code })).status).toBe(400);
    expect(
      (await prisma.paymentAccount.findUniqueOrThrow({ where: { id: old.id } })).closedAt,
    ).toBeNull();
  });

  it("refuses to replace one that is already closed", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    await replace(method.id, old.id, { code: NEW_CODE });

    expect((await replace(method.id, old.id, { code: "444444" })).status).toBe(409);
  });

  it("keeps the closed number in the admin list and out of the member one", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    await replace(method.id, old.id, { code: NEW_CODE });

    const listed = await adminList(get(`/api/admin/payment-methods/${method.id}/accounts`), {
      params: Promise.resolve({ id: method.id }),
    });
    const codes = (await listed.json()).accounts.map((a: { code: string }) => a.code);
    expect(codes).toContain(old.code);
    expect(codes).toContain(NEW_CODE);

    const offered = await publicList(get("/api/payment-methods"));
    const method_ = (await offered.json()).methods.find((m: { name: string }) => m.name === METHOD);
    expect(method_.accounts.map((a: { code: string }) => a.code)).toEqual([NEW_CODE]);
  });

  it("writes the close and the open to the audit log as one action", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    await replace(method.id, old.id, { code: NEW_CODE });

    const entries = await prisma.auditLog.findMany({
      where: { targetType: "PaymentAccount" },
      orderBy: { createdAt: "asc" },
    });
    const pair = `${old.code} → ${NEW_CODE}`;
    const closed = entries.find((e) => e.action === "CLOSE_PAYMENT_ACCOUNT");
    const opened = entries.find((e) => e.action === "CREATE_PAYMENT_ACCOUNT");

    expect(closed?.targetLabel).toBe(pair);
    expect(opened?.targetLabel).toBe(pair);
    expect(closed?.targetId).toBe(old.id);
    expect(JSON.stringify(closed?.after)).toContain("closedAt");
  });

  it("turns away anyone who is not an admin", async () => {
    const method = await theMethod();
    const old = await itsAccount(method.id);
    await resetDb();
    expect((await replace(method.id, old.id, { code: NEW_CODE })).status).toBe(401);
  });
});
