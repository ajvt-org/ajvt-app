import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { activities } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/duplicate",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const source = await prisma.activity.findUnique({ where: { id } });
    if (!source) return NextResponse.json({ error: activities.notFound }, { status: 404 });

    const { _max } = await prisma.activity.aggregate({ _max: { order: true } });

    const activity = await prisma.activity.create({
      data: {
        title: activities.copyOf(source.title),
        description: source.description,
        period: source.period,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        withTime: source.withTime,
        photo: source.photo,
        capacity: source.capacity,
        isOpen: source.isOpen,
        autoApprove: source.autoApprove,
        isTournament: source.isTournament,
        showScorersAndCards: source.showScorersAndCards,
        format: source.format,
        matchShape: source.matchShape,
        minTeamSize: source.minTeamSize,
        maxTeamSize: source.maxTeamSize,
        organisedByHomeVillage: source.organisedByHomeVillage,
        outsidePlayerLimit: source.outsidePlayerLimit,
        yellowsForBan: source.yellowsForBan,
        redBanMatches: source.redBanMatches,
        isVolunteer: source.isVolunteer,
        whatsappLink: source.whatsappLink,
        published: false,
        order: (_max.order ?? -1) + 1,
      },
    });

    await logAction(session.username, "DUPLICATE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: activity.id,
      before: { copiedFrom: source.id },
      after: { title: activity.title, published: false },
    });

    return NextResponse.json({ activity });
  },
);
