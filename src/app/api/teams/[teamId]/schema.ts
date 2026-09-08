import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const handoverSchema = z.object({
  captainUserId: z.string(INVALID).min(1, INVALID),
});
