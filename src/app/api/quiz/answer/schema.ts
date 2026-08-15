import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;
const ANSWER_REQUIRED = "يجب اختيار إجابة واحدة على الأقل";

export const quizAnswerSchema = z.object({
  assignmentId: z.string(INVALID).min(1, INVALID),
  selectedAnswerIds: z.array(z.string(ANSWER_REQUIRED), ANSWER_REQUIRED),
});
