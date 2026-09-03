export interface SupporterGiven {
  total: number;
}

export interface SupportersSummary {
  count: number;
  given: number;
}

export function supportersSummary(rows: SupporterGiven[]): SupportersSummary {
  return {
    count: rows.length,
    given: rows.reduce((sum, row) => sum + row.total, 0),
  };
}

export function supportersPage(
  params: URLSearchParams,
  pageSize: number,
): { offset: number; limit: number } {
  return {
    offset: Math.max(0, Number(params.get("offset")) || 0),
    limit: Math.min(pageSize, Math.max(1, Number(params.get("limit")) || pageSize)),
  };
}
