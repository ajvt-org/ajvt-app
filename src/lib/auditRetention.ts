export const AUDIT_LOG_DAYS = 365;
export const AUDIT_LOGIN_DAYS = 90;
export const AUDIT_LOGIN_ACTION = "ADMIN_LOGIN";

export function auditCutoff(now: Date, days: number): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
