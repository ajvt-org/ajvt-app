export interface Registration {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  paymentProof: string | null;
  rejectionReason: string | null;
  createdAt: string;
  source: "SELF" | "ADMIN" | null;
  recordedBy: string | null;
  team: { id: string; name: string } | null;
  member: { id: string; fullName: string; phone: string | null; age: string; photo: string | null };
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  period: string | null;
  startsAt: string | null;
  endsAt: string | null;
  unplayedMatches?: number;
  withTime: boolean;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  published: boolean;
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
  order: number;
  createdAt: string;
  registrations: Registration[];
  pendingJoinRequests: number;
}

export interface MemberOption {
  id: string;
  fullName: string;
  phone: string | null;
  photo: string | null;
  age: string | null;
  village: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export interface NewActivityDraft {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  photo: string;
  isTournament: boolean;
  format: string;
  profile: string;
  teamSize: string;
  isVolunteer: boolean;
  whatsappLink: string;
}

export function emptyNewActivity(): NewActivityDraft {
  return {
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    photo: "",
    isTournament: false,
    format: "KNOCKOUT",
    profile: "FOOTBALL",
    teamSize: "",
    isVolunteer: false,
    whatsappLink: "",
  };
}

export type ActivityNature = "normal" | "tournament" | "volunteer";

export function natureOf(draft: Pick<NewActivityDraft, "isTournament" | "isVolunteer">) {
  return draft.isTournament ? "tournament" : draft.isVolunteer ? "volunteer" : "normal";
}

export function withNature(draft: NewActivityDraft, nature: ActivityNature): NewActivityDraft {
  return {
    ...draft,
    isTournament: nature === "tournament",
    isVolunteer: nature === "volunteer",
  };
}
