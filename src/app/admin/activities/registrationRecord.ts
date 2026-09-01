import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export const NEWEST_FIRST = "newest";
export const OLDEST_FIRST = "oldest";

export function howRegistered(registration: Registration): string {
  const { source, recordedBy } = registration;
  if (source === "SELF") return texts.addedBySelf;
  if (source === "ADMIN") {
    return recordedBy ? texts.addedByAdmin(recordedBy) : texts.addedByAdminUnnamed;
  }
  return texts.addedUnknown;
}

export function requestedOn(registration: Registration): string {
  return new Date(registration.createdAt).toISOString().slice(0, 10);
}

export function byRequestedDate<T extends Registration>(rows: T[], order: string): T[] {
  const newest = order !== OLDEST_FIRST;
  return [...rows].sort((a, b) => {
    const gap = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return newest ? -gap : gap;
  });
}

export function sortOptions() {
  return [
    { value: NEWEST_FIRST, label: texts.newestFirst },
    { value: OLDEST_FIRST, label: texts.oldestFirst },
  ];
}
