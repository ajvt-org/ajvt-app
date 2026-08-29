import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;
const BACKWARDS = "تاريخ البداية بعد تاريخ النهاية";

const day = z
  .string(INVALID)
  .regex(/^\d{4}-\d{2}-\d{2}$/, INVALID)
  .refine((v) => !Number.isNaN(Date.parse(v)), INVALID);

export const dateSpanSchema = z
  .object({ from: day, to: day })
  .refine((v) => v.from <= v.to, BACKWARDS);

export function spanBounds(from: string, to: string): { from: Date; to: Date } {
  return { from: new Date(`${from}T00:00:00.000Z`), to: new Date(`${to}T23:59:59.999Z`) };
}
