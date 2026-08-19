export interface Registration {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  paymentProof: string | null;
  rejectionReason: string | null;
  member: { id: string; fullName: string; phone: string | null; age: string };
}

export interface Activity {
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
  isVolunteer: boolean;
  whatsappLink: string | null;
  order: number;
  createdAt: string;
  registrations: Registration[];
}

export interface MemberOption {
  id: string;
  fullName: string;
  phone: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "غير مقبول",
};

export interface NewActivityDraft {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  photo: string;
  isTournament: boolean;
  format: string;
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
    isVolunteer: false,
    whatsappLink: "",
  };
}
