import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const activities = await prisma.activity.findMany({
      orderBy: [{ isOpen: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        period: true,
        capacity: true,
        isOpen: true,
        _count: { select: { registrations: true } },
      },
    });

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        period: a.period,
        capacity: a.capacity,
        isOpen: a.isOpen,
        registrantCount: a._count.registrations,
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
