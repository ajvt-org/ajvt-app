import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMemberships } from "@/lib/currentMembershipServer";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { activityAttentionCount } from "@/lib/activityAttentionServer";
import { withRoute } from "@/lib/route";
import { hasFullAccess } from "@/lib/adminRoles";

export const GET = withRoute("GET /api/admin/notifications/summary", async () => {
  const session = await requireUnscopedAdmin();

  const [pendingMembers, pendingActivityWork, pendingDonations] = await Promise.all([
    currentMemberships(prisma).then(
      (memberships) => memberships.filter((m) => m.status === "PENDING").length,
    ),
    activityAttentionCount(null),
    hasFullAccess(session.role)
      ? prisma.donation.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);
  return NextResponse.json({ pendingMembers, pendingActivityWork, pendingDonations });
});
