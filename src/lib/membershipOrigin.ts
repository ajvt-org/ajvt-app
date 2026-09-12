export const ADMIN_ORIGIN = "admin";
export const SELF_ORIGIN = "self";
export const UNKNOWN_ORIGIN = "unknown";

export type MembershipOrigin = typeof ADMIN_ORIGIN | typeof SELF_ORIGIN | typeof UNKNOWN_ORIGIN;

export const MEMBERSHIP_ORIGINS: readonly string[] = [ADMIN_ORIGIN, SELF_ORIGIN, UNKNOWN_ORIGIN];

export interface RecordedPayment {
  recordedBy: string | null;
  recordedByAdminId: string | null;
}

export function membershipOrigin(
  payment: RecordedPayment | null,
  adminNames: ReadonlySet<string>,
): MembershipOrigin {
  if (payment?.recordedByAdminId != null) return ADMIN_ORIGIN;
  if (payment?.recordedBy == null) return UNKNOWN_ORIGIN;
  return adminNames.has(payment.recordedBy) ? ADMIN_ORIGIN : SELF_ORIGIN;
}

export function recordingAdminIds(rows: readonly { recordedByAdminId: string | null }[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.recordedByAdminId) ids.add(row.recordedByAdminId);
  }
  return [...ids];
}
