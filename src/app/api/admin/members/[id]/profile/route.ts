import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";

// Everything the association knows about one person, in one answer. The facts
// live in five tables — the member, their activity registrations, their teams,
// their donations and the audit trail — and until now no screen joined them,
// so "has this person taken part before?" meant walking four tabs.
export const GET = withRoute(
  "GET /api/admin/members/[id]/profile",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, phone: true, createdAt: true } },
        registrations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
            activity: { select: { id: true, title: true, startsAt: true } },
          },
        },
        teamMemberships: {
          select: {
            status: true,
            team: {
              select: { id: true, name: true, activity: { select: { id: true, title: true } } },
            },
          },
        },
        donations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            status: true,
            source: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    // The trail is written with targetType/targetId, so a member's own history
    // is a plain lookup rather than a scan of every line.
    const history = await prisma.auditLog.findMany({
      where: { targetType: "Member", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, adminUsername: true, createdAt: true, targetLabel: true },
    });

    return NextResponse.json({ member, history });
  },
);
