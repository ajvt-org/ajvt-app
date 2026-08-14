import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { logAction } from "@/lib/audit";

export const DELETE = withRoute(
  "DELETE /api/admin/bookings/[bookingId]",
  async (_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { bookingId } = await params;

    const booking = await prisma.matchBooking.findUnique({
      where: { id: bookingId },
      select: { cardType: true, member: { select: { fullName: true } } },
    });
    if (!booking) return NextResponse.json({ ok: true });

    await prisma.matchBooking.delete({ where: { id: bookingId } });
    await logAction(
      session.username,
      "DELETE_BOOKING",
      `${booking.member.fullName} — ${booking.cardType}`,
    );

    return NextResponse.json({ ok: true });
  },
);
