import {
  activityStage,
  sortActivities,
  type ActivityStage,
  type OrderedActivity,
} from "./activityOrder";

export interface Arrangeable extends OrderedActivity {
  id: string;
}

export interface StageGroup<T> {
  stage: ActivityStage;
  rows: T[];
}

export function arrangedGroups<T extends Arrangeable>(
  rows: T[],
  now = new Date(),
): StageGroup<T>[] {
  const groups: StageGroup<T>[] = [];
  for (const row of sortActivities(rows, now)) {
    const stage = activityStage(row, now);
    const last = groups[groups.length - 1];
    if (last && last.stage === stage) last.rows.push(row);
    else groups.push({ stage, rows: [row] });
  }
  return groups;
}

export function moveWithinStage<T extends Arrangeable>(
  rows: T[],
  id: string,
  direction: -1 | 1,
  now = new Date(),
): { id: string; order: number }[] {
  const groups = arrangedGroups(rows, now);
  const group = groups.find((g) => g.rows.some((row) => row.id === id));
  if (!group) return [];

  const index = group.rows.findIndex((row) => row.id === id);
  const target = index + direction;
  if (target < 0 || target >= group.rows.length) return [];

  const moved = [...group.rows];
  [moved[index], moved[target]] = [moved[target], moved[index]];

  const sequence = groups.flatMap((g) => (g === group ? moved : g.rows));
  return sequence
    .map((row, order) => ({ id: row.id, order }))
    .filter((next, order) => sequence[order].order !== next.order);
}
