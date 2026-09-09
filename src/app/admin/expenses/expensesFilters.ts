export const EXPENSES_FILTER_KEYS = ["q", "tags", "destination", "from", "to"];

export interface ExpensesFilters {
  q: string;
  tagIds: string[];
  destinationId: string;
  dateFrom: string;
  dateTo: string;
}

export function readExpensesFilters(params: URLSearchParams): ExpensesFilters {
  const tags = params.get("tags");
  return {
    q: params.get("q") || "",
    tagIds: tags ? tags.split(",").filter(Boolean) : [],
    destinationId: params.get("destination") || "",
    dateFrom: params.get("from") || "",
    dateTo: params.get("to") || "",
  };
}

export function writeExpensesFilters(filters: ExpensesFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.tagIds.length > 0) params.set("tags", filters.tagIds.join(","));
  if (filters.destinationId) params.set("destination", filters.destinationId);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  return params;
}

export const NO_EXPENSES_FILTERS: ExpensesFilters = {
  q: "",
  tagIds: [],
  destinationId: "",
  dateFrom: "",
  dateTo: "",
};

export const TAG_CHIP = "tag:";

export function activeExpensesFilterCount(filters: ExpensesFilters): number {
  const single = [!!filters.destinationId, !!filters.dateFrom, !!filters.dateTo];
  return filters.tagIds.length + single.filter(Boolean).length;
}

export function expensesAreFiltered(filters: ExpensesFilters): boolean {
  return activeExpensesFilterCount(filters) > 0 || filters.q.trim().length > 0;
}

export function withoutExpensesChip(filters: ExpensesFilters, key: string): ExpensesFilters {
  if (key.startsWith(TAG_CHIP)) {
    const id = key.slice(TAG_CHIP.length);
    return { ...filters, tagIds: filters.tagIds.filter((kept) => kept !== id) };
  }
  if (key === "destination") return { ...filters, destinationId: "" };
  if (key === "dateFrom") return { ...filters, dateFrom: "" };
  if (key === "dateTo") return { ...filters, dateTo: "" };
  return filters;
}
