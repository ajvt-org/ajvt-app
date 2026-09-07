import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const answerRequestSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
  accept: z.boolean(INVALID),
});

export const removeMemberSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});
