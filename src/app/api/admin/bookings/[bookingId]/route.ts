import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nameOf } from "@/lib/person";
import { accountOf } from "@/lib/memberAccount";
import { requireBookingAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { bookingUpdateSchema } from "@/app/api/admin/matches/[matchId]/bookings/schema";
import { tournament } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/bookings/[bookingId]",
  async (req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    const { bookingId } = await params;
    const session = await requireBookingAccess(bookingId);
    const { memberId, teamId, cardType, minute } = parse(bookingUpdateSchema, await req.json());

    const booking = await prisma.matchBooking.findUnique({
      where: { id: bookingId },
      select: {
        cardType: true,
        minute: true,
        memberId: true,
        teamId: true,
        match: { select: { homeTeamId: true, awayTeamId: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: tournament.bookingNotFound }, { status: 404 });
    }

    const nextTeamId = teamId ?? booking.teamId;
    const nextMemberId = memberId ?? booking.memberId;
    if (nextTeamId !== booking.match.homeTeamId && nextTeamId !== booking.match.awayTeamId) {
      return NextResponse.json({ error: tournament.teamNotInMatch }, { status: 400 });
    }
    const inRoster = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: nextTeamId, userId: await accountOf(prisma, nextMemberId) },
      },
    });
    if (!inRoster) {
      return NextResponse.json({ error: tournament.playerNotInTeam }, { status: 400 });
    }

    const updated = await prisma.matchBooking.update({
      where: { id: bookingId },
      data: {
        memberId: nextMemberId,
        teamId: nextTeamId,
        cardType: cardType ?? booking.cardType,
        minute: minute === undefined ? booking.minute : minute,
      },
      select: {
        id: true,
        cardType: true,
        minute: true,
        teamId: true,
        memberId: true,
        user: { select: { fullName: true } },
      },
    });

    await logAction(
      session.username,
      "UPDATE_BOOKING",
      `${nameOf(updated.user)} — ${updated.cardType}`,
      {
        ...auditContext(session, req),
        targetType: "MatchBooking",
        targetId: bookingId,
        before: {
          memberId: booking.memberId,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
        after: {
          memberId: updated.memberId,
          teamId: updated.teamId,
          cardType: updated.cardType,
          minute: updated.minute,
        },
      },
    );

    return NextResponse.json({ booking: updated });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/bookings/[bookingId]",
  async (req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    const { bookingId } = await params;
    const session = await requireBookingAccess(bookingId);

    const booking = await prisma.matchBooking.findUnique({
      where: { id: bookingId },
      select: {
        cardType: true,
        minute: true,
        matchId: true,
        teamId: true,
        memberId: true,
        user: { select: { fullName: true } },
      },
    });
    if (!booking) return NextResponse.json({ ok: true });

    await prisma.matchBooking.delete({ where: { id: bookingId } });
    await logAction(
      session.username,
      "DELETE_BOOKING",
      `${nameOf(booking.user)} — ${booking.cardType}`,
      {
        ...auditContext(session, req),
        targetType: "MatchBooking",
        targetId: bookingId,
        before: {
          matchId: booking.matchId,
          memberId: booking.memberId,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
