// The account's number is the member's number. `Member.phone` used to be asked
// for separately, which let one person carry two, so nothing writes a second
// one any more: it is a copy of the account number on its way out of the
// schema. A member added by an admin has no account yet and nothing else, so
// the copy stays the fallback until the column goes.
export function memberPhone(member: {
  phone?: string | null;
  user?: { phone: string } | null;
}): string | null {
  return member.user?.phone ?? member.phone ?? null;
}
