import { z } from "zod";
import { common } from "@/lib/messages";
import { MVP_VOTE_MINUTES_MAX, MVP_VOTE_MINUTES_MIN } from "@/lib/mvpVote";

const INVALID = common.invalidBody;
const CANDIDATE_COUNT = "يجب اختيار بين 2 و6 لاعبين مرشحين";
const DUPLICATE = "لا يمكن اختيار نفس اللاعب مرتين";
const MINUTES = `مدة التصويت بالدقائق بين ${MVP_VOTE_MINUTES_MIN} و${MVP_VOTE_MINUTES_MAX}`;

const minutes = z
  .number(MINUTES)
  .int(MINUTES)
  .min(MVP_VOTE_MINUTES_MIN, MINUTES)
  .max(MVP_VOTE_MINUTES_MAX, MINUTES);

const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 6;

export const mvpVoteCreateSchema = z.object({
  candidateMemberIds: z
    .array(z.string(CANDIDATE_COUNT), CANDIDATE_COUNT)
    .min(MIN_CANDIDATES, CANDIDATE_COUNT)
    .max(MAX_CANDIDATES, CANDIDATE_COUNT)
    .refine((ids) => new Set(ids).size === ids.length, DUPLICATE),
  minutes: minutes.optional(),
});

export const mvpVoteStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"], INVALID).optional(),
  minutes: minutes.optional(),
});
