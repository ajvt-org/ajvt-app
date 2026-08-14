import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/expenses", async () => {
  await requireAdmin();
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ expenses });
});

export const POST = withRoute("POST /api/admin/expenses", async (req: NextRequest) => {
  const session = await requireAdmin();
  const { label, amount, note, date, proof } = await req.json();

  if (!label?.trim()) {
    return NextResponse.json({ error: "وصف المصروف مطلوب" }, { status: 400 });
  }
  if (label.trim().length > 100) {
    return NextResponse.json({ error: "الوصف طويل جداً (100 حرف كحد أقصى)" }, { status: 400 });
  }
  const n = Number(amount);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  if (proof !== undefined && proof !== null && typeof proof !== "string") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  let parsedDate = new Date();
  if (date !== undefined && date !== null) {
    parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    }
  }

  const expense = await prisma.expense.create({
    data: {
      label: label.trim(),
      amount: n,
      note: note?.trim() || null,
      proof: proof || null,
      date: parsedDate,
      createdBy: session.username,
    },
  });
  await logAction(session.username, "CREATE_EXPENSE", `${expense.label} — ${expense.amount} أوقية`);

  return NextResponse.json({ expense }, { status: 201 });
});
