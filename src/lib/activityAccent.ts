import { activityStanding, type StandingInput } from "./activityStanding";

export function activityAccent(activity: StandingInput, now = new Date()): string {
  const standing = activityStanding(activity, now);
  if (!standing) return "";
  if (standing.state === "today" || standing.state === "running") return "activity-row-live";
  if (standing.state === "upcoming" || standing.state === "awaiting") return "activity-row-soon";
  return "activity-row-done";
}
