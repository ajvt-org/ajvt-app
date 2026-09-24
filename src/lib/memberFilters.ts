import {
  holdsMembership,
  membershipState,
  type MembershipState,
  type StatefulMembership,
} from "./membershipState";
import { containsSearch, normalizeSearch } from "./searchText";
import { ADMIN_ORIGIN, MEMBERSHIP_ORIGINS, type MembershipOrigin } from "./membershipOrigin";
import { DEFAULT_MEMBER_SORT, readMemberSort, type MemberSort } from "./memberSort";

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
  "recorder",
  "nophone",
  "nocapture",
  "sort",
] as const;

export type MemberFilterKey = (typeof MEMBER_FILTER_KEYS)[number];

export const MULTI_FILTER_KEYS = ["age", "village"] as const;

type MultiFilterKey = (typeof MULTI_FILTER_KEYS)[number];

export type MemberFilters = Record<Exclude<MemberFilterKey, MultiFilterKey | "sort">, string> &
  Record<MultiFilterKey, string[]> & { sort: MemberSort };

export const NO_FILTERS: MemberFilters = {
  status: "ALL",
  q: "",
  age: [],
  village: [],
  method: "",
  paid: "",
  year: "",
  standing: "",
  from: "",
  to: "",
  origin: "",
  recorder: "",
  nophone: "",
  nocapture: "",
  sort: DEFAULT_MEMBER_SORT,
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
  origin?: MembershipOrigin;
  recordedByAdminId?: string | null;
  user?: { phone: string | null } | null;
};

const LEGACY_STANDING: Record<string, string> = { paid: "current", behind: "former" };

function isMulti(key: MemberFilterKey): key is MultiFilterKey {
  return (MULTI_FILTER_KEYS as readonly string[]).includes(key);
}

export function readFilters(params: URLSearchParams): MemberFilters {
  const filters = { ...NO_FILTERS };
  for (const key of MEMBER_FILTER_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    if (isMulti(key)) filters[key] = value.split(",").filter(Boolean);
    else if (key === "sort") filters.sort = readMemberSort(value);
    else filters[key] = value;
  }
  filters.standing = LEGACY_STANDING[filters.standing] ?? filters.standing;
  if (!MEMBERSHIP_ORIGINS.includes(filters.origin)) filters.origin = "";
  if (filters.origin !== ADMIN_ORIGIN) Object.assign(filters, ADMIN_NARROWINGS);
  return filters;
}

function written(filters: MemberFilters, key: MemberFilterKey): string {
  if (isMulti(key)) return filters[key].join(",");
  if (key === "q") return filters.q.trim();
  return filters[key] === NO_FILTERS[key] ? "" : filters[key];
}

export function writeFilters(filters: MemberFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of MEMBER_FILTER_KEYS) {
    const value = written(filters, key);
    if (value) params.set(key, value);
  }
  return params;
}

const NOT_NARROWING: MemberFilterKey[] = ["status", "q", "sort"];

export function activeFilterCount(filters: MemberFilters): number {
  return MEMBER_FILTER_KEYS.filter((key) => !NOT_NARROWING.includes(key)).reduce(
    (count, key) => count + (isMulti(key) ? filters[key].length : filters[key] ? 1 : 0),
    0,
  );
}

export function withoutNarrowing(filters: MemberFilters): MemberFilters {
  return { ...NO_FILTERS, status: filters.status, q: filters.q, sort: filters.sort };
}

export const AGE_CHIP = "age:";
export const VILLAGE_CHIP = "village:";

const ADMIN_NARROWINGS = { recorder: "", nophone: "", nocapture: "" };

export function withoutMemberChip(filters: MemberFilters, key: string): MemberFilters {
  if (key.startsWith(AGE_CHIP)) {
    const value = key.slice(AGE_CHIP.length);
    return { ...filters, age: filters.age.filter((kept) => kept !== value) };
  }
  if (key.startsWith(VILLAGE_CHIP)) {
    const value = key.slice(VILLAGE_CHIP.length);
    return { ...filters, village: filters.village.filter((kept) => kept !== value) };
  }
  if (key === "origin") return { ...filters, origin: "", ...ADMIN_NARROWINGS };
  if (!(MEMBER_FILTER_KEYS as readonly string[]).includes(key) || key === "sort") return filters;
  return { ...filters, [key]: "" };
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
  if (!MEMBERSHIP_ORIGINS.includes(filters.origin)) return true;
  if (member.origin !== filters.origin) return false;
  if (filters.origin !== ADMIN_ORIGIN) return true;
  if (filters.recorder && member.recordedByAdminId !== filters.recorder) return false;
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
  if (filters.age.length > 0 && !filters.age.includes(member.age ?? "")) return false;
  if (filters.village.length > 0 && !filters.village.includes(member.village)) return false;
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
