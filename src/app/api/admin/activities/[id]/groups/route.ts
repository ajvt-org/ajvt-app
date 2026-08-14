import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/groups",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const groups = await prisma.group.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ groups });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/groups",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { name, capacity } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم المجموعة مطلوب" }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json(
        { error: "اسم المجموعة طويل جداً (40 حرفاً كحد أقصى)" },
        { status: 400 },
      );
    }
    let capacityValue: number | null = null;
    if (capacity !== undefined && capacity !== null && capacity !== "") {
      capacityValue = Number(capacity);
      if (!Number.isInteger(capacityValue) || capacityValue < 2 || capacityValue > 64) {
        return NextResponse.json(
          { error: "عدد الفرق المستهدف يجب أن يكون بين 2 و64" },
          { status: 400 },
        );
      }
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { isTournament: true },
    });
    if (!activity?.isTournament) {
      return NextResponse.json({ error: "هذا النشاط ليس بطولة" }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: { activityId: id, name: name.trim(), capacity: capacityValue },
    });
    await logAction(session.username, "CREATE_GROUP", group.name);

    return NextResponse.json({ group }, { status: 201 });
  },
);
