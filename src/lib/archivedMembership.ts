import type { Prisma, ReviewStatus } from "@prisma/client";

const STATUSES = ["PENDING", "ACTIVE", "REJECTED"] as const;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function moment(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const when = new Date(value);
  return Number.isNaN(when.getTime()) ? null : when;
}

function standing(value: unknown): ReviewStatus {
  return (STATUSES as readonly string[]).includes(String(value))
    ? (value as ReviewStatus)
    : "PENDING";
}

export function archivedMembership(row: Record<string, unknown>): Prisma.MembershipCreateManyInput {
  const created = moment(row.createdAt);
  return {
    ...(text(row.id) ? { id: text(row.id) as string } : {}),
    userId: String(row.userId),
    year: Number(row.year),
    status: standing(row.status),
    rejectionReason: text(row.rejectionReason),
    endedAt: moment(row.endedAt),
    endedReason: text(row.endedReason),
    endedBy: text(row.endedBy),
    ...(created ? { createdAt: created } : {}),
  };
}
