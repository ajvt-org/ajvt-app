import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const tournamentSetupSchema = z.object({
  format: z.enum(["KNOCKOUT", "GROUPS_THEN_KNOCKOUT"], INVALID),
  groups: z
    .array(
      z.object({
        name: z
          .string(INVALID)
          .refine((v) => v.trim().length > 0, INVALID)
          .transform((v) => v.trim()),
        teamIds: z.array(z.string(INVALID)),
      }),
    )
    .default([]),
  qualifierCount: z.number(INVALID).int(INVALID).nonnegative(INVALID).default(0),
  startsAt: z.string(INVALID).refine((v) => !Number.isNaN(Date.parse(v)), INVALID),
  times: z.array(z.string(INVALID)).default([]),
  venue: z.string(INVALID).nullish(),
});
