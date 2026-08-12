import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { label, amount, note, date, proof } = await req.json();

    if ([label, amount, note, date, proof].every((v) => v === undefined)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    const data: { label?: string; amount?: number; note?: string | null; date?: Date; proof?: string | null } = {};

    if (label !== undefined) {
      if (!label.trim()) return NextResponse.json({ error: "وصف المصروف مطلوب" }, { status: 400 });
      if (label.trim().length > 100) return NextResponse.json({ error: "الوصف طويل جداً (100 حرف كحد أقصى)" }, { status: 400 });
      data.label = label.trim();
    }

    if (amount !== undefined) {
      const n = Number(amount);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" }, { status: 400 });
      }
      data.amount = n;
    }

    if (note !== undefined) {
      data.note = note?.trim() || null;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
      }
      data.date = parsedDate;
    }

    if (proof !== undefined) {
      if (proof !== null && typeof proof !== "string") {
        return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
      }
      data.proof = proof;
    }

    const expense = await prisma.expense.update({ where: { id }, data });
    await logAction(session.username, "UPDATE_EXPENSE", `${expense.label} — ${expense.amount} أوقية`);

    return NextResponse.json({ expense });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Expense update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });
    await logAction(session.username, "DELETE_EXPENSE", `${existing.label} — ${existing.amount} أوقية`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Expense delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
