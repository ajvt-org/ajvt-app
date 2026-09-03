import { activityStage } from "@/lib/activityOrder";
import type { Activity } from "./activityTypes";
import { activityRow as texts } from "@/lib/texts";

export const ACTIVITIES_VIEW_KEYS = ["q", "type", "state", "stage", "waiting"];

export const DEFAULT_STAGE = "current";

export interface ActivitiesView {
  q: string;
  type: string;
  state: string;
  stage: string;
  waiting: string;
}

export interface FilterAxis {
  key: "type" | "state" | "stage";
  label: string;
  options: { value: string; label: string }[];
}

export const FILTER_AXES: FilterAxis[] = [
  {
    key: "type",
    label: texts.filters.typeAxis,
    options: [
      { value: "", label: texts.filters.any },
      { value: "tournament", label: texts.filters.tournament },
      { value: "volunteer", label: texts.filters.volunteer },
      { value: "plain", label: texts.filters.plain },
    ],
  },
  {
    key: "state",
    label: texts.filters.stateAxis,
    options: [
      { value: "", label: texts.filters.any },
      { value: "open", label: texts.filters.open },
      { value: "closed", label: texts.filters.closed },
    ],
  },
  {
    key: "stage",
    label: texts.filters.stageAxis,
    options: [
      { value: "all", label: texts.filters.any },
      { value: "current", label: texts.filters.current },
      { value: "finished", label: texts.filters.finished },
    ],
  },
];

export function readActivitiesView(params: URLSearchParams): ActivitiesView {
  return {
    q: params.get("q") || "",
    type: params.get("type") || "",
    state: params.get("state") || "",
    stage: params.get("stage") || DEFAULT_STAGE,
    waiting: params.get("waiting") || "",
  };
}

export function writeActivitiesView(view: ActivitiesView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set("q", view.q.trim());
  if (view.type) params.set("type", view.type);
  if (view.state) params.set("state", view.state);
  if (view.stage && view.stage !== DEFAULT_STAGE) params.set("stage", view.stage);
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

function matchesStage(activity: Activity, stage: string, now: Date): boolean {
  const finished = activityStage(activity, now) === "finished";
  if (stage === "current") return !finished;
  if (stage === "finished") return finished;
  return true;
}

export function matchesActivitiesView(
  activity: Activity,
  view: ActivitiesView,
  now = new Date(),
): boolean {
  if (!matchesType(activity, view.type)) return false;
  if (!matchesState(activity, view.state)) return false;
  if (!matchesStage(activity, view.stage, now)) return false;
  const q = view.q.trim();
  return !q || activity.title.includes(q);
}

export function countForOption(
  activities: Activity[],
  view: ActivitiesView,
  axis: FilterAxis["key"],
  value: string,
  now = new Date(),
): number {
  const asked = { ...view, [axis]: value };
  return activities.filter((activity) => matchesActivitiesView(activity, asked, now)).length;
}
