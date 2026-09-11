export const ENDING_ACTIONS = ["END_MEMBERSHIP", "RESTORE_MEMBERSHIP"] as const;

export interface EndingAuditRow {
  action: string;
  adminUsername: string;
  createdAt: Date | string;
  before: unknown;
  after: unknown;
}

export interface EndingRecord {
  year: number;
  reason: string | null;
  endedAt: string;
  endedBy: string | null;
  restoredAt: string | null;
  restoredBy: string | null;
}

function field(snapshot: unknown, key: string): unknown {
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  return (snapshot as Record<string, unknown>)[key] ?? null;
}

function year(snapshot: unknown): number | null {
  const value = field(snapshot, "year");
  return typeof value === "number" ? value : null;
}

function text(snapshot: unknown, key: string): string | null {
  const value = field(snapshot, key);
  return typeof value === "string" ? value : null;
}

function moment(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function stillEnded(records: EndingRecord[], forYear: number): EndingRecord | undefined {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (record.year === forYear && record.restoredAt === null) return record;
  }
  return undefined;
}

export function endingHistory(rows: EndingAuditRow[]): EndingRecord[] {
  const records: EndingRecord[] = [];

  for (const row of rows) {
    if (row.action === "END_MEMBERSHIP") {
      const ofYear = year(row.after);
      if (ofYear === null) continue;
      records.push({
        year: ofYear,
        reason: text(row.after, "endedReason"),
        endedAt: text(row.after, "endedAt") ?? moment(row.createdAt),
        endedBy: text(row.after, "endedBy") ?? row.adminUsername,
        restoredAt: null,
        restoredBy: null,
      });
      continue;
    }

    if (row.action !== "RESTORE_MEMBERSHIP") continue;
    const ofYear = year(row.before);
    if (ofYear === null) continue;
    const open = stillEnded(records, ofYear);
    if (!open) continue;
    open.restoredAt = moment(row.createdAt);
    open.restoredBy = row.adminUsername;
  }

  return records;
}

export type BroughtBackEnding = EndingRecord & { restoredAt: string };

export function endingsBroughtBack(records: EndingRecord[], forYear: number): BroughtBackEnding[] {
  return records
    .filter((record): record is BroughtBackEnding => {
      return record.year === forYear && record.restoredAt !== null;
    })
    .reverse();
}
