export interface QueueRow {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export function awaitsReview(row: Pick<QueueRow, "status">): boolean {
  return row.status === "PENDING";
}

export function nextAwaitingReview<T extends QueueRow>(
  rows: T[],
  fromId: string,
  step: 1 | -1,
): T | null {
  const at = rows.findIndex((row) => row.id === fromId);
  if (at === -1) return null;
  for (let i = at + step; i >= 0 && i < rows.length; i += step) {
    if (awaitsReview(rows[i])) return rows[i];
  }
  return null;
}
