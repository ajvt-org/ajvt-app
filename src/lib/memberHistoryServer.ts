import { prisma } from "@/lib/prisma";
import { feeOnly, paidForYear } from "@/lib/paidBreakdown";
import { CONFIDENTIAL_SELECT, seesSupporterName, type SupportViewer } from "@/lib/supportPrivacy";
import { currentMembership } from "@/lib/currentMembershipServer";
import { paymentOfYear } from "@/lib/membershipPaymentFields";
import { getAppSettings } from "@/lib/settingsServer";
import { renewalRefusal } from "@/lib/renewal";
import { endingHistory, ENDING_ACTIONS } from "@/lib/membershipEndingHistory";

export async function memberMembershipHistory(id: string, viewer: SupportViewer) {
  const { membershipYear } = await getAppSettings();
  const current = await currentMembership(prisma, id);
  if (!current) return null;

  const account = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { memberNumber: true, ...CONFIDENTIAL_SELECT },
  });
  const named = seesSupporterName(viewer, { userId: id, user: account });

  const [rows, endings, payments] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: id },
      orderBy: { year: "desc" },
      select: { id: true, year: true, status: true, rejectionReason: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { targetType: "Member", targetId: id, action: { in: [...ENDING_ACTIONS] } },
      orderBy: { createdAt: "asc" },
      select: { action: true, adminUsername: true, createdAt: true, before: true, after: true },
    }),
    prisma.payment.findMany({
      where: { userId: id, purpose: "MEMBERSHIP" },
      select: { amount: true, feeApplied: true, year: true, method: true, recordedBy: true },
    }),
  ]);

  return {
    memberships: rows.map((m) => {
      const banked = paidForYear(payments, m.year);
      const paid = named ? banked : feeOnly(banked);
      const payment = paymentOfYear(payments, m.year);
      return {
        ...m,
        paymentMethod: payment?.method ?? null,
        recordedBy: payment?.recordedBy ?? null,
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
    endings: endingHistory(endings),
    currentYear: membershipYear,
    refusal: renewalRefusal(
      {
        status: current.status,
        membershipYear: current.year,
        memberNumber: account.memberNumber,
      },
      membershipYear,
    ),
  };
}
