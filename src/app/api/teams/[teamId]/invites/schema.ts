import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const inviteSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});

export const answerSchema = z.object({
  accept: z.boolean(INVALID),
});
