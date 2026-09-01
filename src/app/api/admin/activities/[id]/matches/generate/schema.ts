import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidValue;

export const generateSchema = z
  .object({
    perTeam: z.number().int().min(1).max(10).optional(),
    times: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, INVALID))
      .min(1)
      .max(6)
      .optional(),
    venue: z.string().max(60).nullish(),
  })
  .strict();
