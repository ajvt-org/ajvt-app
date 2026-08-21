import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;
const BACKWARDS = "تاريخ البداية بعد تاريخ النهاية";

const day = z
  .string(INVALID)
  .regex(/^\d{4}-\d{2}-\d{2}$/, INVALID)
  .refine((v) => !Number.isNaN(Date.parse(v)), INVALID);

export const financeReportSchema = z
  .object({ from: day, to: day })
  .refine((v) => v.from <= v.to, BACKWARDS);
