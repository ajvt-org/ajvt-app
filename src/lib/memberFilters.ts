import {
  holdsMembership,
  membershipState,
  type MembershipState,
  type StatefulMembership,
} from "./membershipState";
import { containsSearch, normalizeSearch } from "./searchText";

export const MEMBER_FILTER_KEYS = [
  "status",
  "q",
  "age",
  "village",
  "method",
  "paid",
  "year",
  "standing",
  "from",
  "to",
  "origin",
  "nophone",
  "nocapture",
] as const;

export type MemberFilterKey = (typeof MEMBER_FILTER_KEYS)[number];

export type MemberFilters = Record<MemberFilterKey, string>;

export const NO_FILTERS: MemberFilters = {
  status: "ALL",
  q: "",
  age: "",
  village: "",
  method: "",
  paid: "",
  year: "",
  standing: "",
  from: "",
  to: "",
  origin: "",
  nophone: "",
  nocapture: "",
};

export type FilterableMember = {
  status: string;
  endedAt: string | null;
  fullName: string;
  referenceCode: string | null;
  age: string | null;
  village: string;
  paymentMethod: string | null;
  paidAmount: number | null;
  membershipYear: number;
  createdAt?: string;
  paymentProof?: string | null;
  recordedByAdmin?: boolean;
  user?: { phone: string | null } | null;
};

export const ADMIN_ORIGIN = "admin";

const LEGACY_STANDING: Record<string, string> = { paid: "current", behind: "former" };

export function readFilters(params: URLSearchParams): MemberFilters {
  const filters = { ...NO_FILTERS };
  for (const key of MEMBER_FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  filters.standing = LEGACY_STANDING[filters.standing] ?? filters.standing;
  if (filters.origin !== ADMIN_ORIGIN) {
    filters.origin = "";
    filters.nophone = "";
    filters.nocapture = "";
  }
  return filters;
}

export function writeFilters(filters: MemberFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of MEMBER_FILTER_KEYS) {
    const value = key === "q" ? filters.q.trim() : filters[key];
    if (value && value !== NO_FILTERS[key]) params.set(key, value);
  }
  return params;
}

export function activeFilterCount(filters: MemberFilters): number {
  return [...writeFilters(filters)].length;
}

function matchesText(member: FilterableMember, q: string): boolean {
  const needle = normalizeSearch(q);
  if (!needle) return true;
  return (
    containsSearch(member.fullName, needle) ||
    containsSearch(member.user?.phone, needle) ||
    containsSearch(member.referenceCode, needle)
  );
}

function matchesOrigin(member: FilterableMember, filters: MemberFilters): boolean {
  if (filters.origin !== ADMIN_ORIGIN) return true;
  if (!member.recordedByAdmin) return false;
  if (filters.nophone && member.user?.phone) return false;
  if (filters.nocapture && member.paymentProof) return false;
  return true;
}

function matchesPaid(member: FilterableMember, paid: string, fee: number): boolean {
  if (!paid) return true;
  const amount = member.paidAmount ?? 0;
  if (paid === "none") return amount === 0;
  if (paid === "partial") return amount > 0 && amount < fee;
  if (paid === "full") return amount >= fee;
  return true;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function matchesDateRange(member: FilterableMember, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!member.createdAt) return false;
  const day = dayKey(member.createdAt);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export interface Membership {
  fee: number;
  year: number;
}

function matchesStanding(member: FilterableMember, standing: string, m: Membership): boolean {
  if (!standing) return true;
  const current = member.membershipYear === m.year;
  if (standing === "current") return current;
  if (standing === "former") return !current;
  return true;
}

export function matchesFilters(
  member: FilterableMember,
  filters: MemberFilters,
  membership: Membership,
): boolean {
  if (filters.status && filters.status !== "ALL" && member.status !== filters.status) return false;
  if (filters.age && member.age !== filters.age) return false;
  if (filters.village && member.village !== filters.village) return false;
  if (filters.method && member.paymentMethod !== filters.method) return false;
  if (filters.year && String(member.membershipYear) !== filters.year) return false;
  if (!matchesPaid(member, filters.paid, membership.fee)) return false;
  if (!matchesStanding(member, filters.standing, membership)) return false;
  if (!matchesDateRange(member, filters.from, filters.to)) return false;
  if (!matchesOrigin(member, filters)) return false;
  return matchesText(member, filters.q);
}

export function membershipYearsPresent(members: FilterableMember[]): number[] {
  return [...new Set(members.map((m) => m.membershipYear))].sort((a, b) => b - a);
}

function standingOf(member: FilterableMember, year: number): MembershipState {
  return membershipState(
    {
      status: member.status as StatefulMembership["status"],
      membershipYear: member.membershipYear,
      endedAt: member.endedAt,
    },
    year,
  );
}

export function upToDate(members: FilterableMember[], membership: Membership) {
  const active = members.filter((m) => holdsMembership(standingOf(m, membership.year)));
  const current = active.filter((m) => matchesStanding(m, "current", membership));
  return { current: current.length, active: active.length };
}
