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
    const { title, description, period, capacity, isOpen } = await req.json();

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
    }

    const data: {
      title?: string;
      description?: string;
      period?: string | null;
      capacity?: number | null;
      isOpen?: boolean;
    } = {};

    if (title !== undefined) {
      if (!title.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
      if (title.trim().length > 60) return NextResponse.json({ error: "العنوان طويل جداً (60 حرفاً كحد أقصى)" }, { status: 400 });
      data.title = title.trim();
    }
    if (description !== undefined) {
      if (!description.trim()) return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
      if (description.trim().length > 1000) return NextResponse.json({ error: "الوصف طويل جداً (1000 حرف كحد أقصى)" }, { status: 400 });
      data.description = description.trim();
    }
    if (period !== undefined) {
      data.period = period?.trim() || null;
    }
    if (capacity !== undefined) {
      if (capacity === null || capacity === "") {
        data.capacity = null;
      } else {
        const n = Number(capacity);
        if (!Number.isInteger(n) || n <= 0) {
          return NextResponse.json({ error: "السعة يجب أن تكون رقماً صحيحاً موجباً" }, { status: 400 });
        }
        data.capacity = n;
      }
    }
    if (isOpen !== undefined) {
      data.isOpen = !!isOpen;
    }

    const activity = await prisma.activity.update({ where: { id }, data });
    await logAction(session.username, "UPDATE_ACTIVITY", activity.title);

    return NextResponse.json({ activity });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Activity update error:", err);
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

    const activity = await prisma.activity.findUnique({ where: { id }, select: { title: true } });
    if (!activity) {
      return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
    }

    await prisma.activity.delete({ where: { id } });
    await logAction(session.username, "DELETE_ACTIVITY", activity.title);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Activity delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
