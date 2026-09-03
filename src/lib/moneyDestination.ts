export interface MoneyDestination {
  activityId?: string | null;
  competitionId?: string | null;
}

export type DestinationKind = "activity" | "competition" | "general";

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
