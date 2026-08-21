import { z } from "zod";
import { common } from "@/lib/messages";

export const voidSchema = z.object({ voided: z.boolean(common.invalidBody) });
