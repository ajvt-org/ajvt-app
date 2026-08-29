import type { Activity } from "./activityTypes";
import { activityRow as texts } from "@/lib/texts";

export const ACTIVITIES_VIEW_KEYS = ["q", "type", "state", "waiting"];

export interface ActivitiesView {
  q: string;
  type: string;
  state: string;
  waiting: string;
}

export const ACTIVITY_TYPES = [
  { value: "", label: texts.filters.anyType },
  { value: "tournament", label: texts.filters.tournament },
  { value: "volunteer", label: texts.filters.volunteer },
  { value: "plain", label: texts.filters.plain },
];

export const ACTIVITY_STATES = [
  { value: "", label: texts.filters.anyState },
  { value: "open", label: texts.filters.open },
  { value: "closed", label: texts.filters.closed },
];

export function readActivitiesView(params: URLSearchParams): ActivitiesView {
  return {
    q: params.get("q") || "",
    type: params.get("type") || "",
    state: params.get("state") || "",
    waiting: params.get("waiting") || "",
  };
}

export function writeActivitiesView(view: ActivitiesView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set("q", view.q.trim());
  if (view.type) params.set("type", view.type);
  if (view.state) params.set("state", view.state);
  if (view.waiting) params.set("waiting", view.waiting);
  return params;
}

function matchesType(activity: Activity, type: string): boolean {
  if (type === "tournament") return activity.isTournament;
  if (type === "volunteer") return activity.isVolunteer;
  if (type === "plain") return !activity.isTournament && !activity.isVolunteer;
  return true;
}

function matchesState(activity: Activity, state: string): boolean {
  if (state === "open") return activity.isOpen;
  if (state === "closed") return !activity.isOpen;
  return true;
}

export function matchesActivitiesView(activity: Activity, view: ActivitiesView): boolean {
  if (!matchesType(activity, view.type)) return false;
  if (!matchesState(activity, view.state)) return false;
  const q = view.q.trim();
  return !q || activity.title.includes(q);
}
