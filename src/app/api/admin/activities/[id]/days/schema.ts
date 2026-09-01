import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidValue;

export const dayCreateSchema = z
  .object({
    position: z.number().int().min(1).max(365).nullish(),
    isRest: z.boolean().optional(),
    notify: z.boolean().optional(),
  })
  .strict();

export const dayDeleteSchema = z
  .object({
    notify: z.boolean().optional(),
  })
  .strict();

export const dayUpdateSchema = z
  .object({
    isRest: z.boolean(INVALID),
  })
  .strict();

export const dayAssignSchema = z
  .object({
    matchId: z.string().min(1),
    dayId: z.string().min(1).nullable(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, INVALID)
      .optional(),
  })
  .strict();
