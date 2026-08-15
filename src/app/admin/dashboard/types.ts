export type Status = "PENDING" | "ACTIVE" | "REJECTED";
export type FilterTab = "ALL" | Status;

export interface Member {
  id: string;
  userId: string | null; // null = admin-added with an unknown phone number, no account yet
  fullName: string;
  phone: string | null; // null alongside userId — see above
  age: string;
  paymentMethod: string;
  paymentProof: string | null;
  photo: string | null;
  paidAmount: number | null;
  status: Status;
  rejectionReason: string | null;
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
}

export interface OrphanAge {
  name: string;
  count: number;
}
