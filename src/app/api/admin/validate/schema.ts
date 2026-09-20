import { z } from "zod";
import { common, members } from "@/lib/messages";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";

const INVALID = common.invalidBody;

export const validateSchema = z
  .object({
    id: z.string(INVALID).min(1, INVALID),
    action: z.enum(["ACTIVE", "REJECTED"], INVALID),
    rejectionReason: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "REJECTED") return;
    const reason = value.rejectionReason;
    if (reason === undefined || reason === null || reason === "") {
      ctx.addIssue({ code: "custom", message: members.rejectionReasonRequired });
      return;
    }
    if (!(REJECTION_REASONS as readonly string[]).includes(reason as string)) {
      ctx.addIssue({ code: "custom", message: members.rejectionReasonInvalid });
    }
  });
