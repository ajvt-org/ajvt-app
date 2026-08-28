import { z } from "zod";
import { validatePhone } from "@/lib/utils";
import { ageGroups, common, members, villages } from "@/lib/messages";
import { HOME_VILLAGE, VILLAGE_NAME_MAX, requiresAgeGroup } from "@/lib/villages";

const INVALID = common.invalidBody;
const ALL_REQUIRED = "جميع الحقول مطلوبة";
const NAME_TOO_LONG = members.fullNameTooLong;
const AGE_TOO_LONG = ageGroups.nameTooLong;
const STATUS_INVALID = "حالة غير صالحة";

const NAME_MAX = 30;
const AGE_MAX = 30;

const name = z
  .string(ALL_REQUIRED)
  .refine((v) => v.trim().length > 0, ALL_REQUIRED)
  .refine((v) => v.trim().length <= NAME_MAX, NAME_TOO_LONG)
  .transform((v) => v.trim());

const age = z
  .string(ALL_REQUIRED)
  .refine((v) => v.trim().length <= AGE_MAX, AGE_TOO_LONG)
  .transform((v) => v.trim())
  .nullish();

const village = z
  .string(villages.pickVillage)
  .refine((v) => v.trim().length > 0, villages.pickVillage)
  .refine((v) => v.trim().length <= VILLAGE_NAME_MAX, villages.nameTooLong)
  .transform((v) => v.trim())
  .default(HOME_VILLAGE);

export const adminMemberCreateSchema = z
  .object({
    accountPhone: z.string(ALL_REQUIRED).nullish(),
    fullName: name,
    phoneUnknown: z.unknown().optional(),
    age,
    village,
    paymentMethod: z.string(ALL_REQUIRED).refine((v) => v.trim().length > 0, ALL_REQUIRED),
    paymentProof: z.string(INVALID).nullish(),
    photo: z.string(INVALID).nullish(),
    status: z.enum(["PENDING", "ACTIVE"], STATUS_INVALID),
    paidAmount: z.unknown().optional(),
    surplusAnonymous: z.boolean(INVALID).optional(),
  })
  .superRefine((v, ctx) => {
    if (requiresAgeGroup(v.village) && !v.age?.trim()) {
      ctx.addIssue({ code: "custom", path: ["age"], message: members.pickAgeGroup });
    }
    if (v.phoneUnknown) return;
    const phoneError = validatePhone(v.accountPhone ?? "");
    if (phoneError) ctx.addIssue({ code: "custom", message: phoneError });
  });
