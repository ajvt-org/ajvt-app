import { NextRequest, NextResponse } from "next/server";
import { nameOf } from "@/lib/person";
import { requireBookingAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { bookingUpdateSchema } from "@/app/api/admin/matches/[matchId]/bookings/schema";
import { removeBooking, updateBooking } from "@/lib/matchBookingServer";

export const PATCH = withRoute(
  "PATCH /api/admin/bookings/[bookingId]",
  async (req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    const { bookingId } = await params;
    const session = await requireBookingAccess(bookingId);

    const { booking, before } = await updateBooking(
      bookingId,
      parse(bookingUpdateSchema, await req.json()),
    );

    await logAction(
      session.username,
      "UPDATE_BOOKING",
      `${nameOf(booking.user)} — ${booking.cardType}`,
      {
        ...auditContext(session, req),
        targetType: "MatchBooking",
        targetId: bookingId,
        before: {
          userId: before.userId,
          teamId: before.teamId,
          cardType: before.cardType,
          minute: before.minute,
        },
        after: {
          userId: booking.userId,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
      },
    );

    return NextResponse.json({ booking });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/bookings/[bookingId]",
  async (req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    const { bookingId } = await params;
    const session = await requireBookingAccess(bookingId);

    const booking = await removeBooking(bookingId);
    if (!booking) return NextResponse.json({ ok: true });

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
          userId: booking.userId,
          teamId: booking.teamId,
          cardType: booking.cardType,
          minute: booking.minute,
        },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
