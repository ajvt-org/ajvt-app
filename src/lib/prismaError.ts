export function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && err.code === "P2002";
}

export function isForeignKeyViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && err.code === "P2003";
}

export function uniqueViolationFields(err: unknown): string[] {
  if (!isUniqueViolation(err)) return [];
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return target.filter((t): t is string => typeof t === "string");
  return typeof target === "string" ? [target] : [];
}
