import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";
import { ageGroups, common, members, villages } from "@/lib/messages";
import { HOME_VILLAGE, VILLAGE_NAME_MAX, requiresAgeGroup } from "@/lib/villages";

const INVALID = common.invalidBody;

export function memberSubmissionSchema(fee: number) {
  return z
    .object({
      fullName: z
        .string(members.fullNameRequired)
        .min(1, members.fullNameRequired)
        .refine((v) => v.trim().length <= 30, members.fullNameTooLong),
      village: z
        .string(villages.pickVillage)
        .min(1, villages.pickVillage)
        .refine((v) => v.trim().length <= VILLAGE_NAME_MAX, villages.nameTooLong)
        .default(HOME_VILLAGE),
      age: z
        .string(INVALID)
        .refine((v) => v.trim().length <= 30, ageGroups.nameTooLong)
        .nullish(),
      paymentMethod: z.string(members.pickPaymentMethod).min(1, members.pickPaymentMethod),
      paymentProof: z.string("يرجى إرفاق صورة الكابتير").min(1, "يرجى إرفاق صورة الكابتير"),
      photo: z.string(INVALID).nullish(),
      referenceCode: z.string(INVALID).refine(isValidReferenceCode, INVALID).nullish(),
      paidAmount: z.unknown().superRefine((v, ctx) => {
        const message = validatePaidAmount(v, fee);
        if (message) ctx.addIssue({ code: "custom", message });
      }),
      surplusAnonymous: z.boolean(INVALID).optional(),
      id: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (requiresAgeGroup(v.village) && !v.age?.trim()) {
        ctx.addIssue({ code: "custom", path: ["age"], message: members.pickAgeGroup });
      }
    });
}

export type MemberSubmission = z.infer<ReturnType<typeof memberSubmissionSchema>>;
