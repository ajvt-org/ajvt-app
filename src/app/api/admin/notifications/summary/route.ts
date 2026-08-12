import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAdmin();
    // Donations are only visible/actionable on the payments page for SUPER
    // admins (see payment-proofs' includeDonations gate) — skip the count
    // for other roles so their badge doesn't promise something they can't act on.
    const [pendingMembers, pendingTeamRequests, pendingDonations] = await Promise.all([
      prisma.member.count({ where: { status: "PENDING" } }),
      prisma.teamMember.count({ where: { status: "PENDING" } }),
      session.role === "SUPER" ? prisma.donation.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    ]);
    return NextResponse.json({ pendingMembers, pendingTeamRequests, pendingDonations });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
