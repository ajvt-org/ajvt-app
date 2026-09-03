export type AttentionKind = "join" | "registration" | "suspension";

export const ATTENTION_KINDS: AttentionKind[] = ["join", "registration", "suspension"];

export type AttentionSettle =
  | { target: "teamMember"; teamId: string; userId: string }
  | { target: "registration"; registrationId: string };

export interface AttentionRow {
  id: string;
  kind: AttentionKind;
  activityId: string;
  activityTitle: string;
  who: string;
  since: string;
  settle: AttentionSettle | null;
}

export interface AttentionGroup {
  kind: AttentionKind;
  rows: AttentionRow[];
}

export const ATTENTION_TAB: Record<AttentionKind, string> = {
  join: "teams",
  registration: "registrations",
  suspension: "discipline",
};

export function attentionHref(row: { activityId: string; kind: AttentionKind }): string {
  return `/admin/activities/${row.activityId}?tab=${ATTENTION_TAB[row.kind]}`;
}

export function sortAttention(rows: AttentionRow[], newestFirst = false): AttentionRow[] {
  return [...rows].sort((a, b) => {
    const gap = new Date(a.since).getTime() - new Date(b.since).getTime();
    if (gap !== 0) return newestFirst ? -gap : gap;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function groupAttention(rows: AttentionRow[], newestFirst = false): AttentionGroup[] {
  const sorted = sortAttention(rows, newestFirst);
  return ATTENTION_KINDS.map((kind) => ({
    kind,
    rows: sorted.filter((row) => row.kind === kind),
  })).filter((group) => group.rows.length > 0);
}
