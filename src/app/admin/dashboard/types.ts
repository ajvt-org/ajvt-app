export type Status = "PENDING" | "ACTIVE" | "REJECTED";
export type FilterTab = "ALL" | Status | "NO_REQUEST";

export interface BareAccount {
  id: string;
  phone: string | null;
  fullName: string | null;
  village: string;
  age: string | null;
  createdAt: string;
  lastActiveDate: string | null;
  hasPush: boolean;
}

export interface Member {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  age: string | null;
  village: string;
  paymentMethod: string;
  paymentProof: string | null;
  photo: string | null;
  paidAmount: number | null;
  supportAmount: number;
  status: Status;
  rejectionReason: string | null;
  membershipYear: number;
  referenceCode: string | null;
  memberNumber: string | null;
  createdAt: string;
  user?: { phone: string } | null;
  registrations?: { activityId: string; activity: { id: string; title: string } }[];
}

export interface AgeGroup {
  id: string;
  name: string;
  count?: number;
  totalCount?: number;
  approved?: boolean;
}

export interface Village {
  id: string;
  name: string;
  count?: number;
}

export interface OrphanAge {
  name: string;
  count: number;
}
