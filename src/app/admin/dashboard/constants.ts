import type { Status } from "./types";

export const STATUS_LABEL: Record<Status, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "غير مقبول",
};

export const STATUS_BADGE: Record<Status, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

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
