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
    autoApprove: boolean;
    isTournament: boolean;
    showScorersAndCards: boolean;
    format: "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT" | null;
    profile: "FOOTBALL" | "BOARD";
    minTeamSize: number | null;
    maxTeamSize: number | null;
    organisedByTaguilalett: boolean;
    outsidePlayerLimit: number | null;
    isVolunteer: boolean;
    whatsappLink: string | null;
    registrations: {
      id: string;
      status: "PENDING" | "ACTIVE" | "REJECTED";
      createdAt: string;
      paymentProof: string | null;
      rejectionReason: string | null;
      source: "SELF" | "ADMIN" | null;
      recordedBy: string | null;
      team: { id: string; name: string } | null;
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
