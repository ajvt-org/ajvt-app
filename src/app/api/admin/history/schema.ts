import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const HISTORY_TARGETS = [
  "Expense",
  "Donation",
  "Member",
  "Activity",
  "ActivityRegistration",
] as const;

export type HistoryTarget = (typeof HISTORY_TARGETS)[number];

export const historyQuerySchema = z.object({
  targetType: z.enum(HISTORY_TARGETS, INVALID),
  targetId: z.string(INVALID).min(1, INVALID),
});
