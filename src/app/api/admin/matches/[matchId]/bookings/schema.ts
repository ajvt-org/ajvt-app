import { z } from "zod";
import { common, tournament } from "@/lib/messages";

const INVALID = common.invalidBody;
const MINUTE_INVALID = tournament.minuteInvalid;

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

export const bookingUpdateSchema = z.object({
  memberId: z.string(INVALID).min(1, INVALID).optional(),
  teamId: z.string(INVALID).min(1, INVALID).optional(),
  cardType: z.enum(["YELLOW", "RED"], INVALID).optional(),
  minute: minute.optional(),
});
