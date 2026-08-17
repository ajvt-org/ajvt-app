import type { RenewalRefusal } from "@/lib/renewal";

export interface MembershipYear {
  id: string;
  year: number;
  paidAmount: number | null;
  paymentMethod: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface MembershipHistory {
  memberships: MembershipYear[];
  currentYear: number;
  refusal: RenewalRefusal;
}
