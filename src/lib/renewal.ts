export interface RenewableMember {
  status: string;
  membershipYear: number;
  memberNumber: string | null;
}

export type RenewalRefusal = "notActive" | "notIssued" | "alreadyRenewed" | "yearBehind" | null;

export function renewalRefusal(member: RenewableMember, year: number): RenewalRefusal {
  if (member.status !== "ACTIVE") return "notActive";
  if (!member.memberNumber) return "notIssued";
  if (member.membershipYear === year) return "alreadyRenewed";
  if (member.membershipYear > year) return "yearBehind";
  return null;
}

export function canRenew(member: RenewableMember, year: number): boolean {
  return renewalRefusal(member, year) === null;
}

export function yearsOwed(member: RenewableMember, year: number): number {
  return Math.max(0, year - member.membershipYear);
}
