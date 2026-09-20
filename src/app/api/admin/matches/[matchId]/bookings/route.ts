import { NextRequest, NextResponse } from "next/server";
import { nameOf } from "@/lib/person";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { bookingCreateSchema } from "./schema";
import { createBooking } from "@/lib/matchBookingServer";

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/bookings",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    const { booking, proposed } = await createBooking(
      matchId,
      parse(bookingCreateSchema, await req.json()),
    );

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
