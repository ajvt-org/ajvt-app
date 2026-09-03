import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/payment-methods/route";
import { PATCH } from "@/app/api/admin/payment-methods/[id]/route";
import { GET as offeredRoute } from "@/app/api/payment-methods/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, get, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

const NEW_METHOD = "خدمة جديدة";
const SEEDED = "بنكيلي";

async function methodNamed(name: string) {
  return prisma.paymentMethod.findUniqueOrThrow({ where: { name } });
}

function patching(id: string, body: unknown) {
  return [patch(`/api/admin/payment-methods/${id}`, body), withId(id)] as const;
}

async function listed() {
  const res = await GET(get("/api/admin/payment-methods"));
  return (await res.json()).methods as { name: string; used: number; active: boolean }[];
}

describe("managing the payment method list", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses an anonymous caller", async () => {
    const before = await prisma.paymentMethod.count();
    await resetDb();

    const res = await POST(post("/api/admin/payment-methods", { name: NEW_METHOD }));

    expect(res.status).toBe(401);
    expect(await prisma.paymentMethod.count()).toBe(before);
  });

  it("adds a method an admin can then record against", async () => {
    const res = await POST(post("/api/admin/payment-methods", { name: NEW_METHOD }));

    expect(res.status).toBe(201);
    const saved = await methodNamed(NEW_METHOD);
    expect(saved.active).toBe(true);
    expect(saved.memberFacing).toBe(false);
  });

  it("puts a new method after the ones already there", async () => {
    await POST(post("/api/admin/payment-methods", { name: NEW_METHOD }));

    const names = (await listed()).map((row) => row.name);
    expect(names.at(-1)).toBe(NEW_METHOD);
  });

  it("refuses a second method under one name", async () => {
    const res = await POST(post("/api/admin/payment-methods", { name: SEEDED }));

    expect(res.status).toBe(409);
    expect(await prisma.paymentMethod.count({ where: { name: SEEDED } })).toBe(1);
  });

  it("refuses a name that is blank or too long", async () => {
    expect((await POST(post("/api/admin/payment-methods", { name: "   " }))).status).toBe(400);
    expect((await POST(post("/api/admin/payment-methods", { name: "x".repeat(31) }))).status).toBe(
      400,
    );
  });

  it("trims the name it is given", async () => {
    await POST(post("/api/admin/payment-methods", { name: `  ${NEW_METHOD}  ` }));

    await expect(methodNamed(NEW_METHOD)).resolves.toBeDefined();
  });
});

describe("renaming a method", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("carries the records that name it, so no total moves", async () => {
    await prisma.expense.create({
      data: { label: "إيجار", amount: 500, method: SEEDED, createdBy: "admin" },
    });
    const method = await methodNamed(SEEDED);

    const res = await PATCH(...patching(method.id, { name: NEW_METHOD }));

    expect(res.status).toBe(200);
    const expense = await prisma.expense.findFirstOrThrow();
    expect(expense.method).toBe(NEW_METHOD);
    expect(await prisma.expense.count({ where: { method: SEEDED } })).toBe(0);
  });

  it("refuses a name another method already holds", async () => {
    const method = await methodNamed(SEEDED);

    const res = await PATCH(...patching(method.id, { name: "نقداً" }));

    expect(res.status).toBe(409);
    expect((await methodNamed(SEEDED)).name).toBe(SEEDED);
  });

  it("lets a method keep its own name", async () => {
    const method = await methodNamed(SEEDED);

    const res = await PATCH(...patching(method.id, { name: SEEDED }));

    expect(res.status).toBe(200);
  });
});

describe("deactivating and reordering", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps a deactivated method on the list with the records that hold it", async () => {
    await prisma.expense.create({
      data: { label: "إيجار", amount: 500, method: SEEDED, createdBy: "admin" },
    });
    const method = await methodNamed(SEEDED);

    await PATCH(...patching(method.id, { active: false }));

    const row = (await listed()).find((entry) => entry.name === SEEDED);
    expect(row?.active).toBe(false);
    expect(row?.used).toBe(1);
    expect(await prisma.paymentMethod.count({ where: { name: SEEDED } })).toBe(1);
  });

  it("takes a deactivated method out of what the selectors are offered", async () => {
    const method = await methodNamed(SEEDED);
    await PATCH(...patching(method.id, { active: false }));

    const { methods } = await (await offeredRoute(get("/api/payment-methods"))).json();

    expect(methods.map((m: { name: string }) => m.name)).not.toContain(SEEDED);
  });

  it("moves a method up and leaves the rest in order", async () => {
    const before = (await listed()).map((row) => row.name);
    const second = await methodNamed(before[1]);

    await PATCH(...patching(second.id, { move: "up" }));

    const after = (await listed()).map((row) => row.name);
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
    expect(after.slice(2)).toEqual(before.slice(2));
  });

  it("leaves the order alone when the first is moved up", async () => {
    const before = (await listed()).map((row) => row.name);
    const first = await methodNamed(before[0]);

    await PATCH(...patching(first.id, { move: "up" }));

    expect((await listed()).map((row) => row.name)).toEqual(before);
  });

  it("refuses a method that is not there", async () => {
    const res = await PATCH(...patching("missing", { name: NEW_METHOD }));

    expect(res.status).toBe(404);
  });
});
