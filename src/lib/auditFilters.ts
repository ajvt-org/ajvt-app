import type { Prisma } from "@prisma/client";

export type AuditFilters = {
  admin: string;
  action: string;
  target: string;
  from: string;
  to: string;
};

export const NO_AUDIT_FILTERS: AuditFilters = {
  admin: "",
  action: "",
  target: "",
  from: "",
  to: "",
};

export const AUDIT_PAGE_SIZE = 50;

export function readAuditFilters(params: URLSearchParams): AuditFilters {
  return {
    admin: params.get("admin") || "",
    action: params.get("action") || "",
    target: params.get("target") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export function writeAuditFilters(filters: AuditFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, value.trim());
  }
  if (page > 1) params.set("page", String(page));
  return params;
}

export function auditFilterCount(filters: AuditFilters): number {
  return Object.values(filters).filter((value) => value.trim()).length;
}

export function readPage(params: URLSearchParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

export function pageCount(total: number, size = AUDIT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function dayRange(from: string, to: string): Prisma.DateTimeFilter {
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

export function buildWhere(params: URLSearchParams): Prisma.AuditLogWhereInput {
  const { admin, action, target, from, to } = readAuditFilters(params);
  const where: Prisma.AuditLogWhereInput = {};
  if (admin) where.adminUsername = admin;
  if (action) where.action = action;
  if (target) where.targetType = target;
  if (from || to) where.createdAt = dayRange(from, to);
  return where;
}
