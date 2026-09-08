import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { sendMatchReminders, sendTeamChoiceReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { anonymousForYear, paidForYear, type MembershipPaymentRow } from "@/lib/paidBreakdown";
import { asMembershipState, latestMembership } from "@/lib/currentMembership";
import { holdsMembership, membershipState } from "@/lib/membershipState";
import { PERSON_WITH_PHONE_SELECT, personOf } from "@/lib/person";
import { getAppSettings } from "@/lib/settingsServer";
import { accounts } from "@/lib/messages";

const MEMBERSHIP_SELECT = {
  year: true,
  status: true,
  rejectionReason: true,
  endedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ACCOUNT_SELECT = {
  payments: {
    where: { purpose: "MEMBERSHIP" },
    select: {
      amount: true,
      feeApplied: true,
      year: true,
      anonymous: true,
      method: true,
      proof: true,
      referenceCode: true,
    },
  },
  registrations: {
    select: {
      id: true,
      activityId: true,
      status: true,
      rejectionReason: true,
      chosenTeamId: true,
      activity: { select: { id: true, title: true } },
    },
  },
  teamMemberships: {
    select: { status: true, team: { select: { id: true, name: true, activityId: true } } },
  },
} as const;

type Membership = {
  year: number;
  status: string;
  rejectionReason: string | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipMoney = MembershipPaymentRow & {
  anonymous: boolean;
  method: string | null;
  proof: string | null;
  referenceCode: string | null;
};

type Account = {
  phone: string | null;
  payments: MembershipMoney[];
  registrations: unknown[];
  teamMemberships: unknown[];
};

function membershipView(id: string, membership: Membership, account: Account, person: object) {
  const { year, ...rest } = membership;
  const paid = paidForYear(account.payments, year);
  const payment = account.payments.find((row) => row.year === year);
  return {
    ...rest,
    ...person,
    paymentMethod: payment?.method ?? null,
    paymentProof: payment?.proof ?? null,
    referenceCode: payment?.referenceCode ?? null,
    id,
    membershipYear: year,
    surplusAnonymous: anonymousForYear(account.payments, year),
    registrations: account.registrations,
    teamMemberships: account.teamMemberships,
    user: { phone: account.phone },
    paidAmount: paid?.fee ?? null,
    supportAmount: paid?.support ?? 0,
  };
}

export const GET = withRoute("GET /api/user/me", async () => {
  const session = await requireUser();

  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  sendTeamChoiceReminders().catch((err) => logger.error("team.choice.reminders.error", err));

  const { membershipYear: currentYear } = await getAppSettings();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      ...PERSON_WITH_PHONE_SELECT,
      ...ACCOUNT_SELECT,
      memberships: { select: MEMBERSHIP_SELECT },
    },
  });

  if (!user) {
    return NextResponse.json({ error: accounts.notFound }, { status: 404 });
  }

  const current = latestMembership(user.memberships);

  let person = personOf(user);
  const standing = membershipState(asMembershipState(current), currentYear);
  if (!user.memberNumber && holdsMembership(standing)) {
    const issued = await prisma.$transaction(async (tx) => {
      const next = await issueMembership(tx);
      await tx.user.update({ where: { id: session.userId }, data: next });
      return next;
    });
    person = { ...person, ...issued };
  }

  return NextResponse.json({
    ...person,
    phone: user.phone,
    currentYear,
    members: current ? [membershipView(session.userId, current, user, person)] : [],
  });
});
