import { MIN_TEAMS, groupShapes, isValidGroupShape, knockoutIsPossible } from "./tournamentShape";
import { groupsAreEven, holdsEveryTeamOnce, type DrawnGroup } from "./tournamentDraw";

export const WIZARD_STEPS = ["shape", "groups", "schedule", "bracket", "dates"] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export type WizardFormat = "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT";

export interface WizardTeam {
  id: string;
  name: string;
}

export interface WizardState {
  format: WizardFormat | null;
  groupCount: number | null;
  qualifierCount: number | null;
  groups: DrawnGroup<WizardTeam>[];
  startsAt: string;
  times: string[];
}

export type WizardBlocker =
  { kind: "tooFewTeams"; teamCount: number } | { kind: "hasResults"; played: number };

export function stepsFor(format: WizardFormat | null): WizardStep[] {
  if (format === "KNOCKOUT") return ["shape", "bracket", "dates"];
  return [...WIZARD_STEPS];
}

export function wizardBlocker(teamCount: number, played: number): WizardBlocker | null {
  if (played > 0) return { kind: "hasResults", played };
  if (teamCount < MIN_TEAMS) return { kind: "tooFewTeams", teamCount };
  return null;
}

export function formatsFor(teamCount: number): WizardFormat[] {
  const formats: WizardFormat[] = [];
  if (knockoutIsPossible(teamCount)) formats.push("KNOCKOUT");
  if (groupShapes(teamCount).length > 0) formats.push("GROUPS_THEN_KNOCKOUT");
  return formats;
}

export function shapeIsChosen(state: WizardState, teamCount: number): boolean {
  if (state.format === "KNOCKOUT") return knockoutIsPossible(teamCount);
  if (state.format !== "GROUPS_THEN_KNOCKOUT") return false;
  if (state.groupCount === null || state.qualifierCount === null) return false;
  return isValidGroupShape(teamCount, state.groupCount, state.qualifierCount);
}

export function drawIsValid(state: WizardState, teams: WizardTeam[]): boolean {
  if (state.groups.length !== state.groupCount) return false;
  return groupsAreEven(state.groups) && holdsEveryTeamOnce(state.groups, teams);
}

export function canLeave(step: WizardStep, state: WizardState, teams: WizardTeam[]): boolean {
  switch (step) {
    case "shape":
      return shapeIsChosen(state, teams.length);
    case "groups":
      return drawIsValid(state, teams);
    case "dates":
      return state.startsAt !== "" && state.times.filter(Boolean).length > 0;
    default:
      return true;
  }
}

function positionOf(step: WizardStep, format: WizardFormat | null): number {
  return stepsFor(format).indexOf(step);
}

export function nextStep(
  step: WizardStep,
  state: WizardState,
  teams: WizardTeam[],
): WizardStep | null {
  if (!canLeave(step, state, teams)) return null;
  const steps = stepsFor(state.format);
  return steps[positionOf(step, state.format) + 1] ?? null;
}

export function previousStep(step: WizardStep, format: WizardFormat | null): WizardStep | null {
  const steps = stepsFor(format);
  const at = positionOf(step, format);
  return at > 0 ? steps[at - 1] : null;
}

export function isLastStep(step: WizardStep, format: WizardFormat | null): boolean {
  const steps = stepsFor(format);
  return steps.indexOf(step) === steps.length - 1;
}
