import { parseMatchDate } from "./clubTime";

export interface PaymentDated<T> {
  paidOn: T | null;
  createdAt: T;
}

export interface DateWindow {
  gte?: Date;
  lte?: Date;
}

export const PAYMENT_DATE_SELECT = { paidOn: true, createdAt: true } as const;

export function paymentDate<T>(payment: PaymentDated<T>): T {
  return payment.paidOn ?? payment.createdAt;
}

export function paidWithin(window: DateWindow | undefined) {
  if (!window || (!window.gte && !window.lte)) return {};
  return { OR: [{ paidOn: window }, { paidOn: null, createdAt: window }] };
}

const BARE_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const BARE_DAY_HOUR = "12:00";

export function readMoneyDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = value as string;
  const parsed = parseMatchDate(BARE_DAY.test(raw) ? `${raw}T${BARE_DAY_HOUR}` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
