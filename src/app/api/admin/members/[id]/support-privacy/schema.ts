import { z } from "zod";
import { common } from "@/lib/messages";

export const supportPrivacySchema = z.object({
  confidential: z.boolean(common.invalidBody),
});
