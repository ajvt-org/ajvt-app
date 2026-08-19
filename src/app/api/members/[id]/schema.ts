import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const memberPhotoSchema = z.object({
  photo: z.string(INVALID).nullable(),
});

export const memberSelfSchema = z.object({
  photo: z.string(INVALID).nullable().optional(),
  surplusAnonymous: z.boolean(INVALID).optional(),
});
