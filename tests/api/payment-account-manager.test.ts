import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/payment-methods/[id]/accounts/route";
import { PATCH } from "@/app/api/admin/payment-methods/[id]/accounts/[accountId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, get, patch, createAdmin, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";
const CASH = "نقداً";
const NEW_CODE = "999999";

async function methodNamed(name: string) {
  return prisma.paymentMethod.findUniqueOrThrow({ where: { name } });
}

function on(id: string) {
  return { params: Promise.resolve({ id }) };
}

function onAccount(id: string, accountId: string) {
  return { params: Promise.resolve({ id, accountId }) };
}

async function listed(id: string) {
  const res = await GET(get(`/api/admin/payment-methods/${id}/accounts`), on(id));
  return (await res.json()).accounts as { id: string; code: string; used: number }[];
}

describe("the numbers an admin keeps under a method", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("lists what a method already receives into", async () => {
    const method = await methodNamed(METHOD);
    const accounts = await listed(method.id);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].code).toBeTruthy();
  });

  it("lists none for a method paid in person, which is not an error", async () => {
    const cash = await methodNamed(CASH);
    expect(await listed(cash.id)).toEqual([]);
  });

  it("adds one, and adding a second needs nothing different", async () => {
    const method = await methodNamed(METHOD);
    const first = await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: NEW_CODE }),
      on(method.id),
    );
    expect(first.status).toBe(201);
    const second = await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: "888888" }),
      on(method.id),
    );
    expect(second.status).toBe(201);
    expect(await listed(method.id)).toHaveLength(3);
  });

  it("drops the spaces an admin grouped the number with", async () => {
    const method = await methodNamed(METHOD);
    await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: " 999 999 " }),
      on(method.id),
    );
    expect((await listed(method.id)).map((a) => a.code)).toContain(NEW_CODE);
  });

  it("refuses a number the method already receives into", async () => {
    const method = await methodNamed(METHOD);
    const existing = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    const res = await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: existing.code }),
      on(method.id),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBeTruthy();
  });

  it("takes the same number under another method", async () => {
    const method = await methodNamed(METHOD);
    const existing = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    const cash = await methodNamed(CASH);
    const res = await POST(
      post(`/api/admin/payment-methods/${cash.id}/accounts`, { code: existing.code }),
      on(cash.id),
    );
    expect(res.status).toBe(201);
  });

  it("refuses an empty number", async () => {
    const method = await methodNamed(METHOD);
    const res = await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: "   " }),
      on(method.id),
    );
    expect(res.status).toBe(400);
  });

  it("turns away anyone who is not an admin", async () => {
    await resetDb();
    const method = await methodNamed(METHOD);
    const res = await GET(get(`/api/admin/payment-methods/${method.id}/accounts`), on(method.id));
    expect(res.status).toBe(401);
  });
});

describe("changing a number an admin already added", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function anAccount() {
    const method = await methodNamed(METHOD);
    const account = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    return { method, account };
  }

  it("gives it a description", async () => {
    const { method, account } = await anAccount();
    const res = await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${account.id}`, {
        label: "الحساب القديم",
      }),
      onAccount(method.id, account.id),
    );
    expect(res.status).toBe(200);
    const saved = await prisma.paymentAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(saved.label).toBe("الحساب القديم");
  });

  it("stops it and starts it again", async () => {
    const { method, account } = await anAccount();
    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${account.id}`, { active: false }),
      onAccount(method.id, account.id),
    );
    expect(
      (await prisma.paymentAccount.findUniqueOrThrow({ where: { id: account.id } })).active,
    ).toBe(false);

    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${account.id}`, { active: true }),
      onAccount(method.id, account.id),
    );
    expect(
      (await prisma.paymentAccount.findUniqueOrThrow({ where: { id: account.id } })).active,
    ).toBe(true);
  });

  it("moves one above another", async () => {
    const { method, account } = await anAccount();
    const added = await prisma.paymentAccount.create({
      data: { methodId: method.id, code: NEW_CODE, position: 2 },
    });

    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${added.id}`, { move: "up" }),
      onAccount(method.id, added.id),
    );

    expect((await listed(method.id)).map((a) => a.id)).toEqual([added.id, account.id]);
  });

  it("moves past a closed number in one go, since the list does not show it", async () => {
    const { method, account } = await anAccount();
    const closed = await prisma.paymentAccount.create({
      data: { methodId: method.id, code: NEW_CODE, position: 2, closedAt: new Date() },
    });
    const third = await prisma.paymentAccount.create({
      data: { methodId: method.id, code: "777777", position: 3 },
    });

    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${third.id}`, { move: "up" }),
      onAccount(method.id, third.id),
    );

    const open = (await listed(method.id))
      .filter((row) => row.id !== closed.id)
      .map((row) => row.id);
    expect(open).toEqual([third.id, account.id]);
  });

  it("leaves a stopped number where it is when asked to move it", async () => {
    const { method, account } = await anAccount();
    const stopped = await prisma.paymentAccount.create({
      data: { methodId: method.id, code: NEW_CODE, position: 2, active: false },
    });

    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${stopped.id}`, { move: "up" }),
      onAccount(method.id, stopped.id),
    );

    expect((await listed(method.id)).map((row) => row.id)).toEqual([account.id, stopped.id]);
  });

  it("refuses a number that belongs to another method", async () => {
    const { account } = await anAccount();
    const cash = await methodNamed(CASH);
    const res = await PATCH(
      patch(`/api/admin/payment-methods/${cash.id}/accounts/${account.id}`, { active: false }),
      onAccount(cash.id, account.id),
    );
    expect(res.status).toBe(404);
  });

  it("refuses to type over the number itself", async () => {
    const { method, account } = await anAccount();
    const res = await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${account.id}`, { code: NEW_CODE }),
      onAccount(method.id, account.id),
    );

    expect(res.status).toBe(400);
    expect(
      (await prisma.paymentAccount.findUniqueOrThrow({ where: { id: account.id } })).code,
    ).toBe(account.code);
  });

  it("writes what it was and what it became to the audit log", async () => {
    const { method, account } = await anAccount();
    await PATCH(
      patch(`/api/admin/payment-methods/${method.id}/accounts/${account.id}`, { active: false }),
      onAccount(method.id, account.id),
    );

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "UPDATE_PAYMENT_ACCOUNT" },
      orderBy: { createdAt: "desc" },
    });
    expect(entry.targetType).toBe("PaymentAccount");
    expect(entry.targetId).toBe(account.id);
    expect(JSON.stringify(entry.before)).toContain("true");
    expect(JSON.stringify(entry.after)).toContain("false");
  });

  it("writes an entry when a number is added", async () => {
    const method = await methodNamed(METHOD);
    await POST(
      post(`/api/admin/payment-methods/${method.id}/accounts`, { code: NEW_CODE }),
      on(method.id),
    );
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "CREATE_PAYMENT_ACCOUNT" },
    });
    expect(JSON.stringify(entry.after)).toContain(NEW_CODE);
  });

  it("counts the records that point at a number", async () => {
    const { method, account } = await anAccount();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 100, accountId: account.id },
    });
    const rows = await listed(method.id);
    expect(rows.find((row) => row.id === account.id)?.used).toBe(1);
  });
});
