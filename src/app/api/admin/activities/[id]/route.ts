import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const {
      title,
      description,
      period,
      capacity,
      isOpen,
      photo,
      isTournament,
      isVolunteer,
      whatsappLink,
      order,
    } = await req.json();

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
      photo?: string | null;
      isTournament?: boolean;
      isVolunteer?: boolean;
      whatsappLink?: string | null;
      order?: number;
    } = {};

    if (title !== undefined) {
      if (!title.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
      if (title.trim().length > 60)
        return NextResponse.json(
          { error: "العنوان طويل جداً (60 حرفاً كحد أقصى)" },
          { status: 400 },
        );
      data.title = title.trim();
    }
    if (description !== undefined) {
      if (!description.trim()) return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
      if (description.trim().length > 1000)
        return NextResponse.json({ error: "الوصف طويل جداً (1000 حرف كحد أقصى)" }, { status: 400 });
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
          return NextResponse.json(
            { error: "السعة يجب أن تكون رقماً صحيحاً موجباً" },
            { status: 400 },
          );
        }
        data.capacity = n;
      }
    }
    if (isOpen !== undefined) {
      data.isOpen = !!isOpen;
    }
    if (photo !== undefined) {
      if (photo !== null && typeof photo !== "string") {
        return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
      }
      data.photo = photo;
    }
    if (isTournament !== undefined) {
      data.isTournament = !!isTournament;
    }
    if (isVolunteer !== undefined) {
      data.isVolunteer = !!isVolunteer;
    }
    if (whatsappLink !== undefined) {
      data.whatsappLink = whatsappLink?.trim() || null;
    }
    if (order !== undefined) {
      const n = Number(order);
      if (!Number.isInteger(n)) {
        return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
      }
      data.order = n;
    }

    const nextIsTournament = data.isTournament ?? existing.isTournament;
    const nextIsVolunteer = data.isVolunteer ?? existing.isVolunteer;
    if (nextIsTournament && nextIsVolunteer) {
      return NextResponse.json(
        { error: "لا يمكن أن يكون النشاط بطولة وحملة تطوعية في آن واحد" },
        { status: 400 },
      );
    }
    const nextWhatsappLink =
      data.whatsappLink !== undefined ? data.whatsappLink : existing.whatsappLink;
    if (nextIsVolunteer && !/^https?:\/\//.test(nextWhatsappLink || "")) {
      return NextResponse.json(
        { error: "رابط مجموعة الواتساب مطلوب لحملات التطوع" },
        { status: 400 },
      );
    }

    const activity = await prisma.activity.update({ where: { id }, data });
    await logAction(session.username, "UPDATE_ACTIVITY", activity.title);

    return NextResponse.json({ activity });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Activity update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
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
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Activity delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
