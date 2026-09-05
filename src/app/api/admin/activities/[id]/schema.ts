import { z } from "zod";
import {
  capacity,
  activityDate,
  endsAfterStart,
  matchShapeOnUpdate,
  DATE_ORDER_INVALID,
} from "../schema";
import { activities, common } from "@/lib/messages";
import { MVP_VOTE_MINUTES_MAX, MVP_VOTE_MINUTES_MIN } from "@/lib/mvpVote";

const INVALID = common.invalidBody;
const TITLE_REQUIRED = "العنوان مطلوب";
const TITLE_TOO_LONG = activities.titleTooLong;
const DESCRIPTION_REQUIRED = "الوصف مطلوب";
const DESCRIPTION_TOO_LONG = activities.descriptionTooLong;

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 1000;

const order = z.unknown().superRefine((v, ctx) => {
  if (!Number.isInteger(Number(v))) ctx.addIssue({ code: "custom", message: INVALID });
});

export const activityUpdateSchema = z
  .object({
    title: z
      .string(TITLE_REQUIRED)
      .refine((v) => v.trim().length > 0, TITLE_REQUIRED)
      .refine((v) => v.trim().length <= TITLE_MAX, TITLE_TOO_LONG)
      .transform((v) => v.trim())
      .optional(),
    description: z
      .string(DESCRIPTION_REQUIRED)
      .refine((v) => v.trim().length > 0, DESCRIPTION_REQUIRED)
      .refine((v) => v.trim().length <= DESCRIPTION_MAX, DESCRIPTION_TOO_LONG)
      .transform((v) => v.trim())
      .optional(),
    period: z.string(INVALID).nullish(),
    capacity: capacity.optional(),
    isOpen: z.unknown().optional(),
    autoApprove: z.unknown().optional(),
    photo: z.string(INVALID).nullish(),
    isTournament: z.unknown().optional(),
    showScorersAndCards: z.unknown().optional(),
    format: z.enum(["KNOCKOUT", "GROUPS_THEN_KNOCKOUT"], INVALID).nullish(),
    matchShape: matchShapeOnUpdate.optional(),
    yellowsForBan: z.number().int().min(1).max(10).optional(),
    mvpVoteMinutes: z.number().int().min(MVP_VOTE_MINUTES_MIN).max(MVP_VOTE_MINUTES_MAX).optional(),
    redBanMatches: z.number().int().min(1).max(10).optional(),
    minTeamSize: z.unknown().optional(),
    maxTeamSize: z.unknown().optional(),
    organisedByHomeVillage: z.boolean().optional(),
    outsidePlayerLimit: z.unknown().optional(),
    isVolunteer: z.unknown().optional(),
    published: z.unknown().optional(),
    settlePending: z.enum(["accept", "reject"], INVALID).optional(),
    whatsappLink: z.string(INVALID).nullish(),
    order: order.optional(),
    startsAt: activityDate.optional(),
    endsAt: activityDate.optional(),
    withTime: z.unknown().optional(),
  })
  .refine(endsAfterStart, { message: DATE_ORDER_INVALID, path: ["endsAt"] });
