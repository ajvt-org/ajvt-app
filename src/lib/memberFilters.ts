// What a list of members is being narrowed to, and how that survives a
// reload. Kept apart from the screen so the rules can be tested without
// mounting a 1300-line page, and so the same shape can serve the URL, the
// filter row and the predicate without three copies drifting apart.
//
// Empty string means "no opinion" everywhere: it is what a cleared <select>
// gives, and it keeps the query string free of criteria nobody chose.
export type MemberFilters = {
  status: string;
  q: string;
  age: string;
  method: string;
  paid: string;
};

export const NO_FILTERS: MemberFilters = { status: "ALL", q: "", age: "", method: "", paid: "" };

export type FilterableMember = {
  status: string;
  fullName: string;
  referenceCode: string | null;
  age: string;
  paymentMethod: string;
  paidAmount: number | null;
  user?: { phone: string } | null;
};

export function readFilters(params: URLSearchParams): MemberFilters {
  return {
    status: params.get("status") || NO_FILTERS.status,
    q: params.get("q") || "",
    age: params.get("age") || "",
    method: params.get("method") || "",
    paid: params.get("paid") || "",
  };
}

// Only what was actually chosen is written, so a shared link carries the
// filters and nothing else, and the default view has a clean address.
export function writeFilters(filters: MemberFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.age) params.set("age", filters.age);
  if (filters.method) params.set("method", filters.method);
  if (filters.paid) params.set("paid", filters.paid);
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

// "Paid" is judged against the fee in force, which is a setting rather than a
// constant, so it is passed in rather than read here.
function matchesPaid(member: FilterableMember, paid: string, fee: number): boolean {
  if (!paid) return true;
  const amount = member.paidAmount ?? 0;
  if (paid === "none") return amount === 0;
  if (paid === "partial") return amount > 0 && amount < fee;
  if (paid === "full") return amount >= fee;
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
  return matchesText(member, filters.q);
}
