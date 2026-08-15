import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const memberPhotoSchema = z.object({
  photo: z.string(INVALID).nullable(),
});
