import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const registrations = await prisma.activityRegistration.findMany({
      where: { activityId: id, member: { status: { not: "REJECTED" } } },
      select: {
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            age: true,
            teamMemberships: {
              where: { team: { activityId: id } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { member: { fullName: "asc" } },
    });

    const roster = registrations.map(({ member }) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      age: member.age,
      team: member.teamMemberships[0]?.team || null,
    }));

    return NextResponse.json({ roster });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Roster fetch error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
