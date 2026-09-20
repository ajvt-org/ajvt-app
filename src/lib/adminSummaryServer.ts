import { prisma } from "./prisma";
import { currentMemberships } from "./currentMembershipServer";
import { activityAttentionCount } from "./activityAttentionServer";
import { hasFullAccess } from "./adminRoles";

export async function notificationSummary(role: string) {
  const [pendingMembers, pendingActivityWork, pendingDonations] = await Promise.all([
    currentMemberships(prisma).then(
      (memberships) => memberships.filter((membership) => membership.status === "PENDING").length,
    ),
    activityAttentionCount(null),
    hasFullAccess(role)
      ? prisma.payment.count({
          where: { status: "PENDING", purpose: { in: ["DONATION", "ACTIVITY"] } },
        })
      : Promise.resolve(0),
  ]);

  return { pendingMembers, pendingActivityWork, pendingDonations };
}
