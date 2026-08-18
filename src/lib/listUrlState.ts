export function readPage(params: URLSearchParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  const current = Math.min(page, pageCount(items.length, size));
  return items.slice((current - 1) * size, current * size);
}
