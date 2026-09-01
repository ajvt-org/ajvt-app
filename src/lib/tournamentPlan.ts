import { layoutRounds, matchDaysNeeded } from "./scheduleLayout";
import { atTime, dayDate, endsAtFor } from "./tournamentDays";
import { knockoutRoundSizes } from "./knockoutSlots";

export type PlannedStage = "GROUP" | "KNOCKOUT";

export interface PlannedSlot {
  stage: PlannedStage;
  round: number;
  indexInRound: number;
  dayPosition: number;
  time: string;
  kickOff: Date;
}

export interface TournamentPlan {
  slots: PlannedSlot[];
  dayCount: number;
  endsAt: Date | null;
}

export interface PlanInput {
  startsAt: Date;
  times: string[];
  groupRoundSizes: number[];
  qualifierCount: number;
}

export function planTournament(input: PlanInput): TournamentPlan {
  const { startsAt, times, groupRoundSizes, qualifierCount } = input;
  const bracketSizes = knockoutRoundSizes(qualifierCount);
  const chunkSizes = [...groupRoundSizes, ...bracketSizes];
  const layout = layoutRounds(chunkSizes, times);

  const slots: PlannedSlot[] = [];
  layout.forEach((placements, chunk) => {
    const group = chunk < groupRoundSizes.length;
    placements.forEach((placement, indexInRound) => {
      const dayPosition = placement.day + 1;
      slots.push({
        stage: group ? "GROUP" : "KNOCKOUT",
        round: group ? chunk + 1 : chunk - groupRoundSizes.length + 1,
        indexInRound,
        dayPosition,
        time: placement.time,
        kickOff: atTime(dayDate(startsAt, dayPosition), placement.time),
      });
    });
  });

  const dayCount = matchDaysNeeded(chunkSizes, times);
  return { slots, dayCount, endsAt: endsAtFor(startsAt, dayCount) };
}
