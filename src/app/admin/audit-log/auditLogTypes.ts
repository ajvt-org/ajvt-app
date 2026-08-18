import type { AuditLogEntry } from "@/components/admin/auditLogTypes";

export interface AuditLogPage {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  admins: string[];
  actions: string[];
  targets: string[];
}

export const EMPTY_PAGE: AuditLogPage = {
  logs: [],
  total: 0,
  page: 1,
  pageSize: 50,
  admins: [],
  actions: [],
  targets: [],
};
