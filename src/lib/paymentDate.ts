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

export function readPaidOn(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = value as string;
  const parsed = new Date(BARE_DAY.test(raw) ? `${raw}T12:00:00.000Z` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
