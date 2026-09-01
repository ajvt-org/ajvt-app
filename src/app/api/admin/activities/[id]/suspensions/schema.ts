import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidValue;

export const suspensionCreateSchema = z
  .object({
    userId: z.string().min(1),
    scope: z.enum(["MATCHES", "DAYS", "INDEFINITE"], INVALID),
    matches: z.number().int().min(1).max(50).nullish(),
    until: z.coerce.date().nullish(),
    note: z.string().max(200).nullish(),
  })
  .strict();

export const suspensionDecideSchema = z
  .object({
    approve: z.boolean(INVALID),
  })
  .strict();
