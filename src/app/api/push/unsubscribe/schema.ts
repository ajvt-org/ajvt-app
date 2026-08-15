import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string(INVALID).min(1, INVALID),
});
