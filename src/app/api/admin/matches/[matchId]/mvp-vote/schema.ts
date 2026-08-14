import { z } from "zod";

const INVALID = "بيانات غير صالحة";
const CANDIDATE_COUNT = "يجب اختيار بين 2 و6 لاعبين مرشحين";
const DUPLICATE = "لا يمكن اختيار نفس اللاعب مرتين";

const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 6;

export const mvpVoteCreateSchema = z.object({
  candidateMemberIds: z
    .array(z.string(CANDIDATE_COUNT), CANDIDATE_COUNT)
    .min(MIN_CANDIDATES, CANDIDATE_COUNT)
    .max(MAX_CANDIDATES, CANDIDATE_COUNT)
    .refine((ids) => new Set(ids).size === ids.length, DUPLICATE),
});

export const mvpVoteStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"], INVALID),
});
