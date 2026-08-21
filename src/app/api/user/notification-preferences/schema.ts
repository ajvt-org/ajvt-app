import { z } from "zod";
import { common } from "@/lib/messages";
import { OPT_OUT_CATEGORIES } from "@/lib/notificationCategories";

const INVALID = common.invalidBody;

const OPT_OUT_KEYS = OPT_OUT_CATEGORIES.map((c) => c.key) as [string, ...string[]];

export const notificationPreferenceSchema = z.object({
  category: z.enum(OPT_OUT_KEYS, INVALID),
  enabled: z.boolean(INVALID),
});
