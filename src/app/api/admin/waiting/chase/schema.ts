import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const chaseSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
  kind: z.enum(["pending", "unfinished"], INVALID),
});
