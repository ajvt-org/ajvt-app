import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdminRole("ACTIVITIES");

    const activities = await prisma.activity.findMany({
      orderBy: { order: "asc" },
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
    const { title, description, period, capacity, photo, isTournament, isVolunteer, whatsappLink } =
      await req.json();

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
    if (isTournament && isVolunteer) {
      return NextResponse.json(
        { error: "لا يمكن أن يكون النشاط بطولة وحملة تطوعية في آن واحد" },
        { status: 400 },
      );
    }
    if (isVolunteer && !/^https?:\/\//.test(whatsappLink?.trim() || "")) {
      return NextResponse.json(
        { error: "رابط مجموعة الواتساب مطلوب لحملات التطوع" },
        { status: 400 },
      );
    }

    let capacityValue: number | null = null;
    if (capacity !== undefined && capacity !== null && capacity !== "") {
      const n = Number(capacity);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json(
          { error: "السعة يجب أن تكون رقماً صحيحاً موجباً" },
          { status: 400 },
        );
      }
      capacityValue = n;
    }

    const { _max } = await prisma.activity.aggregate({ _max: { order: true } });

    const activity = await prisma.activity.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        period: period?.trim() || null,
        photo: photo || null,
        capacity: capacityValue,
        isTournament: !!isTournament,
        isVolunteer: !!isVolunteer,
        whatsappLink: isVolunteer ? whatsappLink.trim() : null,
        order: (_max.order ?? -1) + 1,
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
