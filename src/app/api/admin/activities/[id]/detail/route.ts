import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { activities as messages } from "@/lib/messages";

// One activity with everything hanging off it: who registered, which teams
// were made, how many matches were played, and what has been changed about it.
// The list screen could show none of this without opening five other tabs.
export const GET = withRoute(
  "GET /api/admin/activities/[id]/detail",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        registrations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            member: { select: { id: true, fullName: true, age: true, photo: true } },
          },
        },
        teams: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, _count: { select: { members: true } } },
        },
        _count: { select: { matches: true, groups: true } },
      },
    });

    if (!activity) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    const history = await prisma.auditLog.findMany({
      where: { targetType: "Activity", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, adminUsername: true, createdAt: true },
    });

    return NextResponse.json({ activity, history });
  },
);
