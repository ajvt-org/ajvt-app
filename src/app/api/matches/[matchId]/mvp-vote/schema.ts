import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const mvpVoteCastSchema = z.object({
  candidateId: z.string(INVALID).min(1, INVALID),
});
