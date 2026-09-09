import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

const level = z.object({
  id: z.string().nullish(),
  key: z.string(INVALID),
  singular: z.string(INVALID),
  countedBy: z.enum(["OUTCOME", "POINTS"], INVALID).nullable().default(null),
  endsBy: z.enum(["COUNT", "TARGET"], INVALID).nullable().default(null),
  unitCount: z.number().int().nullable().default(null),
  target: z.number().int().nullable().default(null),
  unsettled: z.enum(["CONTINUE", "DECIDER", "DRAW"], INVALID).nullable().default(null),
  margin: z.number().int().nullable().default(null),
  continueUnits: z.number().int().nullable().default(null),
  deciderTarget: z.number().int().nullable().default(null),
  startingCredit: z.number().int().default(0),
  creditWindow: z.number().int().default(0),
});

const move = z.object({
  id: z.string().nullish(),
  levelKey: z.string(INVALID),
  name: z.string(INVALID),
  unitsToSelf: z.number().int().default(0),
  unitsFromOther: z.number().int().default(0),
  endsUnit: z.boolean().default(false),
  unitWorth: z.number().int().nullable().default(null),
});

export const levelsSchema = z.object({
  levels: z.array(level),
  moves: z.array(move).default([]),
});
