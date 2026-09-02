import { nameIsConfidential, type SupportedAccount } from "./supportPrivacy";

const IDENTIFYING = new Set([
  "donorName",
  "donorPhone",
  "donorPhoto",
  "proof",
  "fullName",
  "payerName",
  "phone",
]);

function stripIdentifying(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => stripIdentifying(item, depth + 1));
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !IDENTIFYING.has(key))
      .map(([key, item]) => [key, stripIdentifying(item, depth + 1)]),
  );
}

export function logLabelFor(row: SupportedAccount, label: string): string | undefined {
  return nameIsConfidential(row) ? undefined : label;
}

export function logSnapshotFor(row: SupportedAccount, value: unknown): unknown {
  return nameIsConfidential(row) ? stripIdentifying(value) : value;
}
