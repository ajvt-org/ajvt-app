import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { activityAttentionCount } from "@/lib/activityAttentionServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/notifications/summary", async () => {
  const session = await requireUnscopedAdmin();

  const [pendingMembers, pendingActivityWork, pendingDonations] = await Promise.all([
    prisma.member.count({ where: { status: "PENDING" } }),
    activityAttentionCount(null),
    session.role === "SUPER"
      ? prisma.donation.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);
  return NextResponse.json({ pendingMembers, pendingActivityWork, pendingDonations });
});
