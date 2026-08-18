export const ACTIVITIES_VIEW_KEYS = ["activity"];

export interface ActivitiesView {
  expanded: string;
}

export function readActivitiesView(params: URLSearchParams): ActivitiesView {
  return { expanded: params.get("activity") || "" };
}

export function writeActivitiesView(view: ActivitiesView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.expanded) params.set("activity", view.expanded);
  return params;
}
