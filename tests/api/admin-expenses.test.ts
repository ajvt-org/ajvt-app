import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/admin/expenses/route";
import { PATCH, DELETE } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, get, createAdmin, signInAsAdmin } from "./helpers";

const validExpense = {
  label: "كرات وتجهيزات رياضية",
  amount: 18000,
  note: "فاتورة متوفرة",
  proof: "receipt.webp",
};

function patch(id: string, body: unknown) {
  return [post(`/api/admin/expenses/${id}`, body), { params: Promise.resolve({ id }) }] as const;
}

async function anExpense() {
  return prisma.expense.create({
    data: { label: "إيجار الملعب", amount: 12000, createdBy: "admin" },
  });
}

describe("POST /api/admin/expenses", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await POST(post("/api/admin/expenses", validExpense));

    expect(res.status).toBe(401);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("records an expense for a signed-in admin", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await POST(post("/api/admin/expenses", validExpense));

    expect(res.status).toBe(201);
    const expense = await prisma.expense.findFirstOrThrow();
    expect(expense.label).toBe(validExpense.label);
    expect(expense.amount).toBe(18000);
    expect(expense.createdBy).toBe("admin");
  });

  it("keeps the exact validation messages", async () => {
    await signInAsAdmin(await createAdmin());

    const cases: [Record<string, unknown>, string][] = [
      [{ label: "" }, "وصف المصروف مطلوب"],
      [{ label: "   " }, "وصف المصروف مطلوب"],
      [{ label: undefined }, "وصف المصروف مطلوب"],
      [{ label: "x".repeat(101) }, "الوصف طويل جداً (100 حرف كحد أقصى)"],
      [{ amount: 0 }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ amount: -5 }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ amount: 1.5 }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ amount: "abc" }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ note: 42 }, "بيانات غير صالحة"],
      [{ proof: 42 }, "بيانات غير صالحة"],
      [{ date: "not-a-date" }, "تاريخ غير صالح"],
    ];

    for (const [patchBody, message] of cases) {
      const res = await POST(post("/api/admin/expenses", { ...validExpense, ...patchBody }));
      expect(res.status, JSON.stringify(patchBody)).toBe(400);
      expect(await res.json(), JSON.stringify(patchBody)).toEqual({ error: message });
    }
    expect(await prisma.expense.count()).toBe(0);
  });

  it("accepts a numeric string amount, as the form sends it", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await POST(post("/api/admin/expenses", { ...validExpense, amount: "2500" }));

    expect(res.status).toBe(201);
    expect((await prisma.expense.findFirstOrThrow()).amount).toBe(2500);
  });

  it("lists expenses newest first", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.expense.create({
      data: { label: "قديم", amount: 100, createdBy: "admin", date: new Date("2026-01-01") },
    });
    await prisma.expense.create({
      data: { label: "حديث", amount: 200, createdBy: "admin", date: new Date("2026-08-01") },
    });

    const res = await GET();
    const { expenses } = await res.json();

    expect(res.status).toBe(200);
    expect(expenses.map((e: { label: string }) => e.label)).toEqual(["حديث", "قديم"]);
  });
});

describe("PATCH /api/admin/expenses/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const expense = await anExpense();

    const res = await PATCH(...patch(expense.id, { label: "مخترق" }));

    expect(res.status).toBe(401);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).label).toBe(
      "إيجار الملعب",
    );
  });

  it("updates only the fields sent", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    const res = await PATCH(...patch(expense.id, { amount: 15000 }));

    expect(res.status).toBe(200);
    const after = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(after.amount).toBe(15000);
    expect(after.label).toBe("إيجار الملعب");
  });

  it("rejects an empty patch", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    const res = await PATCH(...patch(expense.id, {}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "بيانات غير صالحة" });
  });

  it("answers 404 for an unknown expense", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(...patch("does-not-exist", { amount: 10 }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "المصروف غير موجود" });
  });

  it("keeps the exact validation messages", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    const cases: [Record<string, unknown>, string][] = [
      [{ label: "" }, "وصف المصروف مطلوب"],
      [{ label: "x".repeat(101) }, "الوصف طويل جداً (100 حرف كحد أقصى)"],
      [{ amount: 0 }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ amount: "abc" }, "المبلغ يجب أن يكون رقماً صحيحاً موجباً"],
      [{ date: "not-a-date" }, "تاريخ غير صالح"],
      [{ proof: 42 }, "بيانات غير صالحة"],
    ];

    for (const [body, message] of cases) {
      const res = await PATCH(...patch(expense.id, body));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(await res.json(), JSON.stringify(body)).toEqual({ error: message });
    }
  });

  it("clears the note when sent empty", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await prisma.expense.create({
      data: { label: "ضيافة", amount: 500, note: "ملاحظة", createdBy: "admin" },
    });

    await PATCH(...patch(expense.id, { note: "  " }));

    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).note).toBeNull();
  });
});

describe("DELETE /api/admin/expenses/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const expense = await anExpense();

    const res = await DELETE(get("/x"), { params: Promise.resolve({ id: expense.id }) });

    expect(res.status).toBe(401);
    expect(await prisma.expense.count()).toBe(1);
  });

  it("deletes for an admin", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    const res = await DELETE(get("/x"), { params: Promise.resolve({ id: expense.id }) });

    expect(res.status).toBe(200);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("answers 404 for an unknown expense", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await DELETE(get("/x"), { params: Promise.resolve({ id: "nope" }) });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "المصروف غير موجود" });
  });
});

describe("expense audit detail", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records the target and the new values on create", async () => {
    await signInAsAdmin(await createAdmin());

    await POST(post("/api/admin/expenses", validExpense));

    const expense = await prisma.expense.findFirstOrThrow();
    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "CREATE_EXPENSE" } });
    expect(entry.targetType).toBe("Expense");
    expect(entry.targetId).toBe(expense.id);
    expect(entry.adminRole).toBe("SUPER");
    expect(entry.after).toMatchObject({ label: validExpense.label, amount: 18000 });
  });

  it("records both sides of an edit", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    await PATCH(...patch(expense.id, { amount: 9999 }));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_EXPENSE" } });
    expect(entry.before).toMatchObject({ amount: 12000 });
    expect(entry.after).toMatchObject({ amount: 9999 });
  });

  it("keeps the row it deleted", async () => {
    await signInAsAdmin(await createAdmin());
    const expense = await anExpense();

    await DELETE(...patch(expense.id, {}));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "DELETE_EXPENSE" } });
    expect(entry.targetId).toBe(expense.id);
    expect(entry.before).toMatchObject({ label: "إيجار الملعب", amount: 12000 });
  });
});
