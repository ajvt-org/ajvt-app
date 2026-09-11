import type { RenewalRefusal } from "@/lib/renewal";
import type { EndingRecord } from "@/lib/membershipEndingHistory";

import type { Status } from "@/app/admin/dashboard/types";

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
  endings: EndingRecord[];
  currentYear: number;
  refusal: RenewalRefusal;
}
