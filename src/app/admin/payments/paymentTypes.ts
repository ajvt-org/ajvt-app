import type { FinanceTag } from "@/components/admin/FinanceTagChips";

export type ProofKind = "MEMBERSHIP" | "ACTIVITY" | "DONATION";

export interface Proof {
  id: string;
  kind: ProofKind;
  proof: string | null;
  memberName: string;
  activityTitle: string | null;
  amount: number | null;
  status: string;
  source?: "PUBLIC" | "SELF";
  paymentMethod?: string | null;
  memberId?: string | null;
  donorName?: string | null;
  donorPhone?: string | null;
  donorPhoto?: string | null;
  tags?: FinanceTag[];
  uploadedAt: string;
  submittedAt: string;
}

export interface DonationResponse {
  donation: {
    id: string;
    donorName: string | null;
    donorPhone: string | null;
    donorPhoto: string | null;
    amount: number | null;
    status: string;
    source: "PUBLIC" | "SELF";
    paymentMethod: string | null;
    proof: string | null;
    memberId: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface MemberOption {
  id: string;
  fullName: string;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};

export const STATUS_CLASS: Record<string, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

export const PAGE_SIZE = 30;
