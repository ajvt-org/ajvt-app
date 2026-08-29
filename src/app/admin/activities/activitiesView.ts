import type { Activity } from "./activityTypes";

export const ACTIVITIES_VIEW_KEYS = ["q", "kind", "waiting"];

export interface ActivitiesView {
  q: string;
  kind: string;
  waiting: string;
}

export const ACTIVITY_KINDS = [
  { value: "", label: "الكل" },
  { value: "open", label: "التسجيل مفتوح" },
  { value: "tournament", label: "بطولات" },
  { value: "volunteer", label: "حملات" },
];

export function readActivitiesView(params: URLSearchParams): ActivitiesView {
  return {
    q: params.get("q") || "",
    kind: params.get("kind") || "",
    waiting: params.get("waiting") || "",
  };
}

export function writeActivitiesView(view: ActivitiesView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set("q", view.q.trim());
  if (view.kind) params.set("kind", view.kind);
  if (view.waiting) params.set("waiting", view.waiting);
  return params;
}

export function matchesActivitiesView(activity: Activity, view: ActivitiesView): boolean {
  if (view.kind === "open" && !activity.isOpen) return false;
  if (view.kind === "tournament" && !activity.isTournament) return false;
  if (view.kind === "volunteer" && !activity.isVolunteer) return false;
  const q = view.q.trim();
  return !q || activity.title.includes(q);
}
