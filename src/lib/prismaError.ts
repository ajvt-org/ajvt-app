// Prisma reports a unique-constraint clash as P2002. Two routes were checking
// for it by hand, one of them by pulling `code` off an `unknown`.
export function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && err.code === "P2002";
}
