export type AuditChange = { key: string; from: unknown; to: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function auditDiff(before: unknown, after: unknown): AuditChange[] {
  if (!isRecord(after)) return [];
  const previous = isRecord(before) ? before : {};
  return Object.keys(after)
    .filter((key) => JSON.stringify(previous[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map((key) => ({ key, from: previous[key], to: after[key] }));
}
