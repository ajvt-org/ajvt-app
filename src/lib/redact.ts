const SECRET_KEY = /pass|secret|token|auth|hash|otp|jwt|cookie|session/i;
const REDACTED = "[محذوف]";

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}
