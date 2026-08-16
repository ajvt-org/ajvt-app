import { z } from "zod";
import { common } from "@/lib/messages";

export const accountPhoneSchema = z.object({
  phone: z.string(common.invalidBody),
});
