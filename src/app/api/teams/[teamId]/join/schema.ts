import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const teamMemberSchema = z.object({
  memberId: z.string(INVALID).min(1, INVALID),
});
