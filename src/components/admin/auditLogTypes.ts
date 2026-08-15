export interface AuditLogEntry {
  id: string;
  adminUsername: string;
  action: string;
  targetLabel: string | null;
  createdAt: string;
  adminRole: string | null;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  meta: unknown;
  ip: string | null;
}
