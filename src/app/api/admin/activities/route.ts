import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdminRole("ACTIVITIES");

    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        registrations: {
          select: {
            id: true,
            status: true,
            paymentProof: true,
            rejectionReason: true,
            createdAt: true,
            member: { select: { id: true, fullName: true, phone: true, age: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ activities });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { title, description, period, capacity, photo, isTournament } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "العنوان والوصف مطلوبان" }, { status: 400 });
    }
    if (title.trim().length > 60) {
      return NextResponse.json({ error: "العنوان طويل جداً (60 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (description.trim().length > 1000) {
      return NextResponse.json({ error: "الوصف طويل جداً (1000 حرف كحد أقصى)" }, { status: 400 });
    }
    if (photo !== undefined && photo !== null && typeof photo !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    let capacityValue: number | null = null;
    if (capacity !== undefined && capacity !== null && capacity !== "") {
      const n = Number(capacity);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: "السعة يجب أن تكون رقماً صحيحاً موجباً" }, { status: 400 });
      }
      capacityValue = n;
    }

    const activity = await prisma.activity.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        period: period?.trim() || null,
        photo: photo || null,
        capacity: capacityValue,
        isTournament: !!isTournament,
      },
    });

    await logAction(session.username, "CREATE_ACTIVITY", activity.title);

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Activity create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
