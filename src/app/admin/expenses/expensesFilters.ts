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
