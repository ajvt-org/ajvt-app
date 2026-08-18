import type { KindFilter } from "./KindTabs";

export interface PaymentsFilters {
  kind: KindFilter;
  q: string;
}

export function readPaymentsFilters(params: URLSearchParams): PaymentsFilters {
  const kind = params.get("kind");
  return {
    kind: kind === "MEMBERSHIP" || kind === "ACTIVITY" || kind === "DONATION" ? kind : "ALL",
    q: params.get("q") || "",
  };
}

export function writePaymentsFilters(filters: PaymentsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return params;
}
