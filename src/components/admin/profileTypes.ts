export type MemberProfile = {
  member: {
    id: string;
    fullName: string;
    phone: string | null;
    age: string | null;
    village: string;
    photo: string | null;
    status: string;
    memberNumber: string | null;
    paidAmount: number | null;
    supportAmount: number;
    paymentMethod: string | null;
    paymentProof: string | null;
    createdAt: string;
    user: { id: string; phone: string; createdAt: string } | null;
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
      amount: number | null;
      status: string;
      source: string;
      paymentMethod: string | null;
      createdAt: string;
    }[];
  };
  history: {
    id: string;
    action: string;
    adminUsername: string;
    createdAt: string;
    targetLabel: string | null;
  }[];
};
