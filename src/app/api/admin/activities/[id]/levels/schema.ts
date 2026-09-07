import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

const level = z.object({
  singular: z.string(INVALID),
  plural: z.string(INVALID),
  ending: z.enum(["PLAY_ALL", "FIRST_TO", "FIRST_PAST"], INVALID).nullable().default(null),
  unitsPerParent: z.number().int().nullable().default(null),
  unitsToWin: z.number().int().nullable().default(null),
  target: z.number().int().nullable().default(null),
  deciderTarget: z.number().int().nullable().default(null),
  bothPastTarget: z.enum(["HIGHER_TOTAL", "PLAY_ON"], INVALID).nullable().default(null),
  extendsWhenLevel: z.boolean().default(false),
  extensionUnits: z.number().int().default(0),
  startingCredit: z.number().int().default(0),
  creditWindow: z.number().int().default(0),
  halvesPerUnit: z.number().int().default(2),
  decision: z.enum(["OUTCOME", "SCORE"], INVALID).nullable().default(null),
  wonUnitWorth: z.number().int().default(1),
  doubledWorth: z.number().int().default(1),
  doublesOnBlankOpponent: z.boolean().default(false),
  doublesOnRecoveredCredit: z.boolean().default(false),
});

export const levelsSchema = z.object({ levels: z.array(level) });
