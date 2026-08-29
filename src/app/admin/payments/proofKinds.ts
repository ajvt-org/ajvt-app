import type { HistoryTarget } from "@/app/api/admin/history/schema";
import type { ProofKind } from "./paymentTypes";

export const HISTORY_TARGET: Record<ProofKind, HistoryTarget> = {
  MEMBERSHIP: "Member",
  ACTIVITY: "ActivityRegistration",
  DONATION: "Donation",
};

export const REUSE_KIND: Partial<Record<ProofKind, "member" | "donation">> = {
  MEMBERSHIP: "member",
  DONATION: "donation",
};
