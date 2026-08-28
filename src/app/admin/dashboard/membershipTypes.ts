import type { RenewalRefusal } from "@/lib/renewal";

import type { Status } from "./types";

export interface MembershipYear {
  id: string;
  year: number;
  status: Status;
  rejectionReason: string | null;
  paidAmount: number | null;
  supportAmount: number;
  paymentMethod: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface MembershipHistory {
  memberships: MembershipYear[];
  currentYear: number;
  refusal: RenewalRefusal;
}
