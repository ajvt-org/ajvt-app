import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const teamMemberSchema = z.object({
  memberId: z.string(INVALID).min(1, INVALID),
});
