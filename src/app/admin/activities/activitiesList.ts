import { activityStage, sortActivities } from "@/lib/activityOrder";
import type { Arrangeable } from "@/lib/activityArrange";

export interface StageSplit<T> {
  current: T[];
  finished: T[];
}

export function splitByStage<T extends Arrangeable>(rows: T[], now = new Date()): StageSplit<T> {
  const split: StageSplit<T> = { current: [], finished: [] };
  for (const row of sortActivities(rows, now)) {
    if (activityStage(row, now) === "finished") split.finished.push(row);
    else split.current.push(row);
  }
  return split;
}

export function registeredCount(activity: { registrations: { status: string }[] }): number {
  return activity.registrations.filter((r) => r.status !== "REJECTED").length;
}

export function pendingCount(activity: { registrations: { status: string }[] }): number {
  return activity.registrations.filter((r) => r.status === "PENDING").length;
}
