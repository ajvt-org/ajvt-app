import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/expenses/route";
import { PATCH } from "@/app/api/admin/expenses/[id]/route";
import { GET as adminMethodsRoute } from "@/app/api/admin/payment-methods/offered/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, get, createAdmin, signInAsAdmin, withId } from "./helpers";

const RETIRED = "نقداً";
const OFFERED = "بنكيلي";

async function deactivate(name: string) {
  await prisma.paymentMethod.update({ where: { name }, data: { active: false } });
}

async function anExpensePaidWith(method: string) {
  return prisma.expense.create({
    data: { label: "إيجار الملعب", amount: 12000, method, createdBy: "admin" },
  });
}

function patch(id: string, body: unknown) {
  return [post(`/api/admin/expenses/${id}`, body), withId(id)] as const;
}

describe("a payment method an admin has deactivated", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is refused on a new record", async () => {
    await deactivate(RETIRED);

    const res = await POST(
      post("/api/admin/expenses", { label: "كرات", amount: 500, method: RETIRED }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("is still accepted on a record that already holds it", async () => {
    const expense = await anExpensePaidWith(RETIRED);
    await deactivate(RETIRED);

    const res = await PATCH(...patch(expense.id, { label: "إيجار الملعب البلدي" }));

    expect(res.status).toBe(200);
    const saved = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(saved.method).toBe(RETIRED);
    expect(saved.label).toBe("إيجار الملعب البلدي");
  });

  it("can be saved again on the record that holds it", async () => {
    const expense = await anExpensePaidWith(RETIRED);
    await deactivate(RETIRED);

    const res = await PATCH(...patch(expense.id, { method: RETIRED, amount: 13000 }));

    expect(res.status).toBe(200);
    const saved = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(saved.method).toBe(RETIRED);
    expect(saved.amount).toBe(13000);
  });

  it("cannot be moved onto a record that holds a different one", async () => {
    const expense = await anExpensePaidWith(OFFERED);
    await deactivate(RETIRED);

    const res = await PATCH(...patch(expense.id, { method: RETIRED }));

    expect(res.status).toBe(400);
    const saved = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(saved.method).toBe(OFFERED);
  });

  it("drops out of what the admin selectors are offered", async () => {
    await deactivate(RETIRED);

    const res = await adminMethodsRoute(get("/api/admin/payment-methods/offered"));
    const { methods } = await res.json();

    expect(methods.map((m: { name: string }) => m.name)).not.toContain(RETIRED);
    expect(methods.map((m: { name: string }) => m.name)).toContain(OFFERED);
  });
});

describe("what the admin method list offers", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("marks which methods a member may pick", async () => {
    const res = await adminMethodsRoute(get("/api/admin/payment-methods/offered"));
    const { methods } = await res.json();

    const cash = methods.find((m: { name: string }) => m.name === RETIRED);
    const online = methods.find((m: { name: string }) => m.name === OFFERED);
    expect(cash.memberFacing).toBe(false);
    expect(online.memberFacing).toBe(true);
  });

  it("keeps the order an admin set rather than an alphabetical one", async () => {
    await prisma.paymentMethod.update({ where: { name: RETIRED }, data: { position: 0 } });

    const res = await adminMethodsRoute(get("/api/admin/payment-methods/offered"));
    const { methods } = await res.json();

    expect(methods[0].name).toBe(RETIRED);
  });
});
