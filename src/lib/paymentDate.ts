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

export function readPaidOn(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
