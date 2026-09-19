import { prisma } from "@/lib/prisma";
import { asMembershipState, byReviewOrder, latestByAccount } from "@/lib/currentMembership";
import { membershipState } from "@/lib/membershipState";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";
import { feeOnly, paidForYear } from "@/lib/paidBreakdown";
import {
  MEMBERSHIP_PAYMENT_SELECT,
  mirroredColumns,
  paymentOfYear,
} from "@/lib/membershipPaymentFields";
import { CONFIDENTIAL_SELECT, seesSupporterName, type SupportViewer } from "@/lib/supportPrivacy";
import { membershipOrigin, recordingAdminIds } from "@/lib/membershipOrigin";
import { getAppSettings } from "@/lib/settingsServer";

const OPTION_SELECT = {
  userId: true,
  year: true,
  status: true,
  endedAt: true,
  createdAt: true,
  user: { select: { fullName: true, phone: true, photo: true, age: true, village: true } },
} as const;

const ROW_SELECT = {
  userId: true,
  year: true,
  status: true,
  rejectionReason: true,
  endedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      ...PERSON_WITH_PHONE_SELECT,
      ...CONFIDENTIAL_SELECT,
      registrations: {
        select: { activityId: true, activity: { select: { id: true, title: true } } },
      },
      payments: { where: { purpose: "MEMBERSHIP" as const }, select: MEMBERSHIP_PAYMENT_SELECT },
    },
  },
} as const;

export async function memberRows(viewer: SupportViewer) {
  const [memberships, admins] = await Promise.all([
    prisma.membership.findMany({ select: ROW_SELECT }),
    prisma.admin.findMany({ select: { username: true } }),
  ]);
  const adminNames = new Set(admins.map((admin) => admin.username));

  const members = byReviewOrder([...latestByAccount(memberships).values()]).map((membership) => {
    const { year, user, userId, ...rest } = membership;
    const { payments, registrations, supportNameConfidential, ...account } = user;
    const named = seesSupporterName(viewer, { userId, user: { supportNameConfidential } });
    const banked = paidForYear(payments, year);
    const paid = named ? banked : feeOnly(banked);
    const payment = paymentOfYear(payments, year);
    return {
      ...withPerson({
        ...rest,
        ...mirroredColumns(payment),
        id: userId,
        userId,
        membershipYear: year,
        user: account,
      }),
      registrations,
      paidAmount: paid?.fee ?? null,
      supportAmount: paid?.support ?? 0,
      origin: membershipOrigin(payment, adminNames),
      recordedByAdminId: payment?.recordedByAdminId ?? null,
    };
  });

  const recordingAdmins = await prisma.admin.findMany({
    where: { id: { in: recordingAdminIds(members) } },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });

  return { members, recordingAdmins };
}

export async function memberOptions() {
  const [memberships, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({ select: OPTION_SELECT }),
    getAppSettings(),
  ]);

  return [...latestByAccount(memberships).values()]
    .filter((row) => membershipState(asMembershipState(row), membershipYear) === "UP_TO_DATE")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(({ userId, user }) => ({
      id: userId,
      fullName: user.fullName ?? "",
      phone: user.phone,
      photo: user.photo,
      age: user.age,
      village: user.village,
    }));
}
