import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { bookingCreateSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/bookings",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { matchId } = await params;
    const { memberId, teamId, cardType, minute } = parse(bookingCreateSchema, await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      return NextResponse.json({ error: "الفريق لا ينتمي إلى هذه المباراة" }, { status: 400 });
    }

    const inRoster = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
    });
    if (!inRoster) {
      return NextResponse.json({ error: "اللاعب لا ينتمي إلى هذا الفريق" }, { status: 400 });
    }

    const booking = await prisma.matchBooking.create({
      data: { matchId, memberId, teamId, cardType, minute: minute ?? null },
      select: {
        id: true,
        cardType: true,
        minute: true,
        teamId: true,
        member: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  },
);
