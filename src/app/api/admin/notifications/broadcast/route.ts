import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("SUPER");
    const { target, activityId, age, title, body } = await req.json();

    if (!["ALL", "ACTIVITY", "AGE"].includes(target)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "العنوان والنص مطلوبان" }, { status: 400 });
    }
    if (title.trim().length > 60 || body.trim().length > 300) {
      return NextResponse.json({ error: "النص طويل جداً" }, { status: 400 });
    }
    if (target === "ACTIVITY" && !activityId) {
      return NextResponse.json({ error: "يرجى اختيار النشاط" }, { status: 400 });
    }
    if (target === "AGE" && !age?.trim()) {
      return NextResponse.json({ error: "يرجى اختيار العصر" }, { status: 400 });
    }

    const where: {
      status: string;
      registrations?: { some: { activityId: string } };
      age?: string;
    } = { status: "ACTIVE" };
    if (target === "ACTIVITY") where.registrations = { some: { activityId } };
    if (target === "AGE") where.age = age.trim();

    const members = await prisma.member.findMany({ where, select: { userId: true } });
    const userIds = Array.from(
      new Set(members.map((m) => m.userId).filter((id): id is string => id !== null)),
    );

    await Promise.all(
      userIds.map((uid) =>
        sendPushToUser(uid, { title: title.trim(), body: body.trim() }).catch((err) =>
          console.error("Broadcast push error:", err),
        ),
      ),
    );

    await logAction(
      session.username,
      "SEND_BROADCAST",
      `${title.trim()} → ${userIds.length} مستلم`,
    );

    return NextResponse.json({ ok: true, recipientCount: userIds.length });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Broadcast error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
