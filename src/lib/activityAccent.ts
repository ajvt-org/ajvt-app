import { activityStanding } from "./activityStanding";

export function activityAccent(
  activity: { startsAt: string | Date | null; endsAt?: string | Date | null },
  now = new Date(),
): string {
  const standing = activityStanding(activity, now);
  if (!standing) return "";
  if (standing.state === "today" || standing.state === "running") return "activity-row-live";
  if (standing.state === "upcoming") return "activity-row-soon";
  return "activity-row-done";
}
