export type AuditChange = { key: string; from: unknown; to: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Only the keys the route wrote into `after` count as changes. `before` is
// often a whole record captured for context, so its extra keys would
// otherwise read as fields wiped by the action. Values compare through
// JSON, which is what the column stores anyway.
export function auditDiff(before: unknown, after: unknown): AuditChange[] {
  if (!isRecord(after)) return [];
  const previous = isRecord(before) ? before : {};
  return Object.keys(after)
    .filter((key) => JSON.stringify(previous[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map((key) => ({ key, from: previous[key], to: after[key] }));
}
