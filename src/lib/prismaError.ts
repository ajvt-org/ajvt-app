// Prisma reports a unique-constraint clash as P2002. Two routes were checking
// for it by hand, one of them by pulling `code` off an `unknown`.
export function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && err.code === "P2002";
}

// Which field clashed. A route that retries one unique field has to tell it
// apart from the others, or it retries a clash no new value can settle.
export function uniqueViolationFields(err: unknown): string[] {
  if (!isUniqueViolation(err)) return [];
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return target.filter((t): t is string => typeof t === "string");
  return typeof target === "string" ? [target] : [];
}
