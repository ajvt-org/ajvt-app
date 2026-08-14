import { z } from "zod";

const INVALID = "بيانات غير صالحة";
const MINUTE_INVALID = "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130";

const MINUTE_MIN = 1;
const MINUTE_MAX = 130;

const minute = z
  .unknown()
  .superRefine((v, ctx) => {
    if (v === null || v === "") return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < MINUTE_MIN || n > MINUTE_MAX) {
      ctx.addIssue({ code: "custom", message: MINUTE_INVALID });
    }
  })
  .transform((v) => (v === null || v === "" ? null : Number(v)));

export const bookingCreateSchema = z.object({
  memberId: z.string(INVALID).min(1, INVALID),
  teamId: z.string(INVALID).min(1, INVALID),
  cardType: z.enum(["YELLOW", "RED"], INVALID),
  minute: minute.optional(),
});
