import { memberStatusLabels } from "@/lib/messages";
import type { Status } from "./types";

export const STATUS_LABEL: Record<Status, string> = memberStatusLabels;

export const STATUS_BADGE: Record<Status, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

export const STATUS_ICON = {
  PENDING: "clock",
  ACTIVE: "check",
  REJECTED: "close",
} as const;

export const PAGE_SIZE = 30;

export const emptyManualForm = {
  accountPhone: "",
  fullName: "",
  phoneUnknown: false,
  age: "",
  paymentMethod: "",
  paidAmount: "",
  status: "ACTIVE" as "PENDING" | "ACTIVE",
};
