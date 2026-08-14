import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const mvpVoteCastSchema = z.object({
  candidateId: z.string(INVALID).min(1, INVALID),
});
