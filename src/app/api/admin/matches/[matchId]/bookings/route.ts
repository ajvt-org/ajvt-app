import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nameOf } from "@/lib/person";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { bookingCreateSchema } from "./schema";
import { tournament } from "@/lib/messages";
import { proposeFromBooking, suspendedUserIds } from "@/lib/suspensionServer";

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/bookings",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const { userId, teamId, cardType, minute } = parse(bookingCreateSchema, await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true, activityId: true },
    });
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      return NextResponse.json({ error: tournament.teamNotInMatch }, { status: 400 });
    }

    const inRoster = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!inRoster) {
      return NextResponse.json({ error: tournament.playerNotInTeam }, { status: 400 });
    }

    const suspended = await suspendedUserIds(match.activityId);
    if (suspended.has(userId)) {
      return NextResponse.json({ error: tournament.memberSuspended }, { status: 409 });
    }

    const { booking, proposed } = await prisma.$transaction(async (tx) => {
      const created = await tx.matchBooking.create({
        data: {
          matchId,
          userId,
          teamId,
          cardType,
          minute: minute ?? null,
        },
        select: {
          id: true,
          cardType: true,
          minute: true,
          teamId: true,
          userId: true,
          user: { select: { fullName: true } },
        },
      });
      const proposal = await proposeFromBooking(tx, match.activityId, userId, cardType);
      return { booking: created, proposed: proposal !== null };
    });

    await logAction(
      session.username,
      "CREATE_BOOKING",
      `${nameOf(booking.user)} — ${booking.cardType}`,
      {
        ...auditContext(session, req),
        targetType: "MatchBooking",
        targetId: booking.id,
        after: {
          matchId,
          userId: booking.userId,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
      },
    );

    return NextResponse.json({ booking, proposed }, { status: 201 });
  },
);
