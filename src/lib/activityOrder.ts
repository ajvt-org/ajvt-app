import { activityStanding, type StandingInput } from "./activityStanding";

export type OrderedActivity = StandingInput & {
  isOpen: boolean;
  order?: number;
};

const LIVE = 0;
const AWAITING = 1;
const UPCOMING = 2;
const UNDATED_OPEN = 3;
const UNDATED_CLOSED = 4;
const FINISHED = 5;

function endTime(activity: OrderedActivity): number {
  const end = activity.endsAt ?? activity.startsAt;
  return end ? new Date(end).getTime() : 0;
}

export type ActivityStage =
  "live" | "awaiting" | "upcoming" | "undatedOpen" | "undatedClosed" | "finished";

const STAGE_KEYS: ActivityStage[] = [
  "live",
  "awaiting",
  "upcoming",
  "undatedOpen",
  "undatedClosed",
  "finished",
];

export function activityRank(activity: OrderedActivity, now = new Date()): [number, number] {
  const standing = activityStanding(activity, now);
  if (!standing) return [activity.isOpen ? UNDATED_OPEN : UNDATED_CLOSED, 0];
  if (standing.state === "today" || standing.state === "running") return [LIVE, 0];
  if (standing.state === "awaiting") return [AWAITING, -endTime(activity)];
  if (standing.state === "upcoming") return [UPCOMING, standing.daysUntil];
  return [FINISHED, -endTime(activity)];
}

export function sortActivities<T extends OrderedActivity>(rows: T[], now = new Date()): T[] {
  return rows
    .map((row, index) => ({ row, index, rank: activityRank(row, now) }))
    .sort(
      (a, b) =>
        a.rank[0] - b.rank[0] ||
        a.rank[1] - b.rank[1] ||
        (a.row.order ?? 0) - (b.row.order ?? 0) ||
        a.index - b.index,
    )
    .map((entry) => entry.row);
}

export function activityStage(activity: OrderedActivity, now = new Date()): ActivityStage {
  return STAGE_KEYS[activityRank(activity, now)[0]];
}
