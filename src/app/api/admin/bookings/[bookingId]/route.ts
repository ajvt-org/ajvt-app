import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const DELETE = withRoute(
  "DELETE /api/admin/bookings/[bookingId]",
  async (_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { bookingId } = await params;

    await prisma.matchBooking.delete({ where: { id: bookingId } }).catch(() => {});

    return NextResponse.json({ ok: true });
  },
);
