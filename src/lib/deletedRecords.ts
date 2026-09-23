import type { Prisma } from "@prisma/client";
import { ELECTIONS_AREA, canOpen } from "./adminNav";

export const RETENTION_DAYS = 30;

export type DeletableKind = "Member" | "Activity" | "User" | "Election";

const KIND_AREAS: Partial<Record<string, string>> = { Election: ELECTIONS_AREA };

export function retentionExpiry(now: Date, days = RETENTION_DAYS): Date {
  const expires = new Date(now);
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function daysLeft(expiresAt: Date, now: Date): number {
  const ms = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function confirmationMatches(typed: string, expected: string): boolean {
  return typed.trim().replace(/\s+/g, " ") === expected.trim().replace(/\s+/g, " ");
}

export function archiveEntry(
  kind: DeletableKind,
  recordId: string,
  label: string,
  data: Prisma.InputJsonValue,
  deletedBy: string,
  now = new Date(),
) {
  return { kind, recordId, label, data, deletedBy, expiresAt: retentionExpiry(now) };
}

export function canHandleKind(role: string | null | undefined, kind: string): boolean {
  const area = KIND_AREAS[kind];
  return area === undefined || canOpen(role, area);
}
