import type { ReviewStatus } from "@prisma/client";

export interface MembershipVerdict {
  status: ReviewStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
}
