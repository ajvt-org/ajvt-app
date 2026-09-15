export type MemberProfile = {
  member: {
    id: string;
    fullName: string;
    phone: string | null;
    age: string | null;
    village: string;
    photo: string | null;
    photoLocked: boolean;
    status: string | null;
    memberNumber: string | null;
    paidAmount: number | null;
    supportAmount: number;
    paymentMethod: string | null;
    accountId: string | null;
    account: { id: string; code: string; label: string | null } | null;
    paymentProof: string | null;
    paymentPaidOn: string | null;
    paymentRecordedAt: string | null;
    membershipYear: number | null;
    endedAt: string | null;
    endedReason: string | null;
    endedBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    user: { id: string; phone: string | null; createdAt: string } | null;
    registrations: {
      id: string;
      status: string;
      rejectionReason: string | null;
      createdAt: string;
      activity: { id: string; title: string; startsAt: string | null };
    }[];
    teamMemberships: {
      status: string;
      team: { id: string; name: string; activity: { id: string; title: string } };
    }[];
    donations: {
      id: string;
      amount: number;
      status: string;
      source: string;
      paymentMethod: string | null;
      createdAt: string;
    }[];
  };
  supportPrivacy: { confidential: boolean; namedEntries: number } | null;
  currentYear: number;
  history: {
    id: string;
    action: string;
    adminUsername: string;
    createdAt: string;
    targetLabel: string | null;
  }[];
};

export type MemberWithMembership = MemberProfile["member"] & {
  membershipYear: number;
  status: string;
  createdAt: string;
};

export function withMembership(member: MemberProfile["member"]): MemberWithMembership | null {
  const { membershipYear, status, createdAt } = member;
  if (membershipYear === null || status === null || createdAt === null) return null;
  return { ...member, membershipYear, status, createdAt };
}
