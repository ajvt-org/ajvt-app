import { z } from "zod";
import { common } from "@/lib/messages";

export const attemptAnswerSchema = z.object({
  answerId: z.string(common.invalidBody).min(1, common.invalidBody),
  selectedAnswerIds: z.array(z.string()).min(1, "اختر إجابة"),
});
