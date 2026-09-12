export interface RecordedPayment {
  recordedBy: string | null;
  recordedByAdminId: string | null;
}

export function recordedByAdmin(
  payment: RecordedPayment | null,
  adminNames: ReadonlySet<string>,
): boolean {
  if (payment === null) return true;
  if (payment.recordedByAdminId !== null) return true;
  return payment.recordedBy !== null && adminNames.has(payment.recordedBy);
}

export function recordingAdminIds(rows: readonly { recordedByAdminId: string | null }[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.recordedByAdminId) ids.add(row.recordedByAdminId);
  }
  return [...ids];
}
