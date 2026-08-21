import { z } from "zod";
import { common, members } from "@/lib/messages";

const INVALID = common.invalidBody;
const BOTH_REQUIRED = "العنوان والنص مطلوبان";
const TOO_LONG = "النص طويل جداً";
const ACTIVITY_REQUIRED = "يرجى اختيار النشاط";
const AGE_REQUIRED = members.pickAgeGroup;

const TITLE_MAX = 60;
const BODY_MAX = 300;

export const broadcastSchema = z
  .object({
    target: z.enum(["ALL", "ACTIVITY", "AGE"], INVALID),
    activityId: z.string(ACTIVITY_REQUIRED).nullish(),
    age: z.string(AGE_REQUIRED).nullish(),
    title: z.string(BOTH_REQUIRED).refine((v) => v.trim().length > 0, BOTH_REQUIRED),
    body: z.string(BOTH_REQUIRED).refine((v) => v.trim().length > 0, BOTH_REQUIRED),
    toEveryone: z.boolean(INVALID).optional(),
  })
  .refine((v) => v.title.trim().length <= TITLE_MAX && v.body.trim().length <= BODY_MAX, TOO_LONG)
  .refine((v) => v.target !== "ACTIVITY" || !!v.activityId, ACTIVITY_REQUIRED)
  .refine((v) => v.target !== "AGE" || !!v.age?.trim(), AGE_REQUIRED);
