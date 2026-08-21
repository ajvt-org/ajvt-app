import { z } from "zod";
import { common } from "@/lib/messages";

export const competitionVoidSchema = z.object({
  userId: z.string(common.invalidBody).min(1, common.invalidBody),
  voided: z.boolean(common.invalidBody),
});
