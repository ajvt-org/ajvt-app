import { z } from "zod";
import { common, tournament } from "@/lib/messages";

const INVALID = common.invalidBody;

export const TEAM_NAME_MAX = 40;

export const newTeamSchema = z.object({
  activityId: z.string(INVALID).min(1, INVALID),
  name: z
    .string(tournament.teamNameRequired)
    .refine((v) => v.trim().length > 0, tournament.teamNameRequired)
    .refine((v) => v.trim().length <= TEAM_NAME_MAX, tournament.teamNameTooLong)
    .transform((v) => v.trim()),
});
