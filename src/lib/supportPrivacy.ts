import { isOwner } from "./adminRoles";
import { splitPayment } from "./membershipPayment";

export interface SupportViewer {
  role?: string | null;
  userId?: string | null;
  onTheRecord?: boolean;
}

export interface SupportedAccount {
  userId: string | null;
  user?: { supportNameConfidential?: boolean } | null;
}

export interface SupportPayment extends SupportedAccount {
  purpose: string;
  amount: number;
  feeApplied?: number | null;
}

export const PUBLIC_VIEWER: SupportViewer = {};

export const ON_THE_RECORD: SupportViewer = { onTheRecord: true };

export const CONFIDENTIAL_SELECT = { supportNameConfidential: true } as const;

export function seesEverySupporterName(viewer: SupportViewer): boolean {
  return viewer.onTheRecord === true || isOwner(viewer.role);
}

export function nameIsConfidential(row: SupportedAccount): boolean {
  return row.user?.supportNameConfidential === true;
}

export function isSelf(viewer: SupportViewer, row: SupportedAccount): boolean {
  return !!row.userId && row.userId === viewer.userId;
}

export function seesSupporterName(viewer: SupportViewer, row: SupportedAccount): boolean {
  if (!nameIsConfidential(row)) return true;
  return seesEverySupporterName(viewer) || isSelf(viewer, row);
}

export function supportPart(payment: SupportPayment): number {
  if (payment.purpose !== "MEMBERSHIP") return payment.amount;
  return splitPayment(payment.amount, payment.feeApplied ?? 0).surplus;
}

export function seesPaymentIdentity(viewer: SupportViewer, payment: SupportPayment): boolean {
  if (supportPart(payment) <= 0) return true;
  return seesSupporterName(viewer, payment);
}

export function withoutFields<T extends object, K extends keyof T>(
  row: T,
  fields: readonly K[],
): Omit<T, K> {
  const kept = { ...row };
  for (const field of fields) delete kept[field];
  return kept;
}

export function redactIdentity<T extends SupportedAccount, K extends keyof T>(
  viewer: SupportViewer,
  row: T,
  fields: readonly K[],
): T | Omit<T, K> {
  return seesSupporterName(viewer, row) ? row : withoutFields(row, fields);
}

export function redactPaymentIdentity<T extends SupportPayment, K extends keyof T>(
  viewer: SupportViewer,
  payment: T,
  fields: readonly K[],
): T | Omit<T, K> {
  return seesPaymentIdentity(viewer, payment) ? payment : withoutFields(payment, fields);
}
