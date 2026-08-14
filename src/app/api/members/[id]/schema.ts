import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const memberPhotoSchema = z.object({
  photo: z.string(INVALID).nullable(),
});
