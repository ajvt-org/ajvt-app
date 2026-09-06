export type MoveDirection = "up" | "down";

export function isMoveDirection(value: unknown): value is MoveDirection {
  return value === "up" || value === "down";
}

export function moveInOrder(ids: string[], id: string, direction: MoveDirection): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ids;
  const moved = [...ids];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}
