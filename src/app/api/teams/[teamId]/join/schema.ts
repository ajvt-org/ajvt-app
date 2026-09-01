import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const teamMemberSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});
