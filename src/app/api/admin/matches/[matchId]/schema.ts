import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

const order = z.unknown().superRefine((v, ctx) => {
  if (!Number.isInteger(Number(v))) ctx.addIssue({ code: "custom", message: INVALID });
});

export const matchUpdateSchema = z.object({
  homeScore: z.unknown().optional(),
  awayScore: z.unknown().optional(),
  homePenalties: z.unknown().optional(),
  awayPenalties: z.unknown().optional(),
  homeGoals: z.unknown().optional(),
  awayGoals: z.unknown().optional(),
  goalEvents: z.unknown().optional(),
  penaltyKicks: z.unknown().optional(),
  matchDate: z.string(INVALID).nullish(),
  round: z.string(INVALID).nullish(),
  venue: z.string(INVALID).nullish(),
  isKnockout: z.unknown().optional(),
  order: order.optional(),
  manOfTheMatchId: z.string(INVALID).nullish(),
  homeTeamId: z.string(INVALID).optional(),
  awayTeamId: z.string(INVALID).optional(),
});
