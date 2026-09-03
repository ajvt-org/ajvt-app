export interface MoneyDestination {
  activityId?: string | null;
  competitionId?: string | null;
}

export type DestinationKind = "activity" | "competition" | "general";

export interface DestinationOption {
  id: string;
  title: string;
  kind: Exclude<DestinationKind, "general">;
}

export const EXPENSE_DESTINATION_SELECT = {
  tags: { select: { id: true, name: true } },
  activity: { select: { id: true, title: true } },
  competition: { select: { id: true, name: true } },
} as const;

export function destinationKind(destination: MoneyDestination): DestinationKind {
  if (destination.activityId) return "activity";
  if (destination.competitionId) return "competition";
  return "general";
}

export function hasTwoDestinations(destination: MoneyDestination): boolean {
  return !!destination.activityId && !!destination.competitionId;
}

export function destinationValue(destination: MoneyDestination): string {
  return destination.activityId || destination.competitionId || "";
}

export function destinationOf(
  options: DestinationOption[],
  value: string,
): { activityId: string | null; competitionId: string | null } {
  const chosen = options.find((option) => option.id === value);
  if (!chosen) return { activityId: null, competitionId: null };
  return chosen.kind === "activity"
    ? { activityId: chosen.id, competitionId: null }
    : { activityId: null, competitionId: chosen.id };
}

export function destinationTitle(options: DestinationOption[], value: string): string | null {
  return options.find((option) => option.id === value)?.title ?? null;
}

export function optionsOfKind(
  options: DestinationOption[],
  kind: DestinationOption["kind"],
): DestinationOption[] {
  return options.filter((option) => option.kind === kind);
}
