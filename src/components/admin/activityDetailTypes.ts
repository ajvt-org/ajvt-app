export type ActivityDetail = {
  activity: {
    id: string;
    title: string;
    description: string;
    period: string | null;
    startsAt: string | null;
    endsAt: string | null;
    withTime: boolean;
    photo: string | null;
    capacity: number | null;
    isOpen: boolean;
    isTournament: boolean;
    format: "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT" | null;
    profile: "FOOTBALL" | "BOARD";
    teamSize: number | null;
    isVolunteer: boolean;
    whatsappLink: string | null;
    registrations: {
      id: string;
      status: "PENDING" | "ACTIVE" | "REJECTED";
      createdAt: string;
      paymentProof: string | null;
      rejectionReason: string | null;
      member: {
        id: string;
        fullName: string;
        age: string;
        photo: string | null;
        phone: string | null;
      };
    }[];
    teams: { id: string; name: string; _count: { members: number } }[];
    _count: { matches: number; groups: number };
  };
  history: { id: string; action: string; adminUsername: string; createdAt: string }[];
};
