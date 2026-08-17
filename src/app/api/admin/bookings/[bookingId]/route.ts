import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBookingAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";

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
        member: { select: { id: true, fullName: true } },
      },
    });
    if (!booking) return NextResponse.json({ ok: true });

    await prisma.matchBooking.delete({ where: { id: bookingId } });
    await logAction(
      session.username,
      "DELETE_BOOKING",
      `${booking.member.fullName} — ${booking.cardType}`,
      {
        ...auditContext(session, req),
        targetType: "MatchBooking",
        targetId: bookingId,
        before: {
          matchId: booking.matchId,
          memberId: booking.member.id,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
