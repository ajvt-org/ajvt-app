export type MemberFilters = {
  status: string;
  q: string;
  age: string;
  method: string;
  paid: string;
  from: string;
  to: string;
};

export const NO_FILTERS: MemberFilters = {
  status: "ALL",
  q: "",
  age: "",
  method: "",
  paid: "",
  from: "",
  to: "",
};

export type FilterableMember = {
  status: string;
  fullName: string;
  referenceCode: string | null;
  age: string;
  paymentMethod: string;
  paidAmount: number | null;
  createdAt?: string;
  user?: { phone: string } | null;
};

export function readFilters(params: URLSearchParams): MemberFilters {
  return {
    status: params.get("status") || NO_FILTERS.status,
    q: params.get("q") || "",
    age: params.get("age") || "",
    method: params.get("method") || "",
    paid: params.get("paid") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export function writeFilters(filters: MemberFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.age) params.set("age", filters.age);
  if (filters.method) params.set("method", filters.method);
  if (filters.paid) params.set("paid", filters.paid);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", String(page));
  return params;
}

export function activeFilterCount(filters: MemberFilters): number {
  return [
    filters.status !== "ALL" && filters.status !== "",
    !!filters.q.trim(),
    !!filters.age,
    !!filters.method,
    !!filters.paid,
    !!filters.from,
    !!filters.to,
  ].filter(Boolean).length;
}

function matchesText(member: FilterableMember, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    member.fullName.toLowerCase().includes(needle) ||
    (member.user?.phone || "").includes(needle) ||
    (member.referenceCode || "").toLowerCase().includes(needle)
  );
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

export function matchesFilters(
  member: FilterableMember,
  filters: MemberFilters,
  fee: number,
): boolean {
  if (filters.status && filters.status !== "ALL" && member.status !== filters.status) return false;
  if (filters.age && member.age !== filters.age) return false;
  if (filters.method && member.paymentMethod !== filters.method) return false;
  if (!matchesPaid(member, filters.paid, fee)) return false;
  if (!matchesDateRange(member, filters.from, filters.to)) return false;
  return matchesText(member, filters.q);
}
