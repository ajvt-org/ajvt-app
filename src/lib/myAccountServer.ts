import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { accounts } from "./messages";
import { issueMembership } from "./member";
import { anonymousForYear, paidForYear, type MembershipPaymentRow } from "./paidBreakdown";
import { asMembershipState, latestMembership } from "./currentMembership";
import { holdsMembership, membershipState } from "./membershipState";
import { PERSON_WITH_PHONE_SELECT, personOf } from "./person";

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

export async function myAccount(userId: string, currentYear: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PERSON_WITH_PHONE_SELECT,
      ...ACCOUNT_SELECT,
      memberships: { select: MEMBERSHIP_SELECT },
    },
  });
  if (!user) throw new NotFoundError(accounts.notFound);

  const current = latestMembership(user.memberships);
  let person = personOf(user);

  if (
    !user.memberNumber &&
    holdsMembership(membershipState(asMembershipState(current), currentYear))
  ) {
    const issued = await prisma.$transaction(async (tx) => {
      const next = await issueMembership(tx);
      await tx.user.update({ where: { id: userId }, data: next });
      return next;
    });
    person = { ...person, ...issued };
  }

  return {
    ...person,
    phone: user.phone,
    currentYear,
    members: current ? [membershipView(userId, current, user, person)] : [],
  };
}
