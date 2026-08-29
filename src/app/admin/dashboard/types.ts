export type Status = "PENDING" | "ACTIVE" | "REJECTED";
export type FilterTab = "ALL" | Status | "NO_REQUEST";

export interface BareAccount {
  id: string;
  // Null for someone an admin added without a number. They cannot sign in, so
  // the actions that need a login are not offered on their row.
  phone: string | null;
  fullName: string | null;
  createdAt: string;
  lastActiveDate: string | null;
  hasPush: boolean;
}

export interface Member {
  id: string;
  userId: string | null; // null = admin-added with an unknown phone number, no account yet
  fullName: string;
  phone: string | null; // null alongside userId — see above
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
