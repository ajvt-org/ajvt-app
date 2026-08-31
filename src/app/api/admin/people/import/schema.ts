import { z } from "zod";
import { common } from "@/lib/messages";
import { MAX_IMPORT_ROWS } from "@/lib/memberImportParse";

const text = z.string(common.invalidBody);

export const importRowSchema = z.object({
  row: z.number(common.invalidBody).int(common.invalidBody),
  personId: text.nullish(),
  values: z.object({
    fullName: text,
    phone: text,
    village: text,
    age: text,
    paid: z.boolean(common.invalidBody),
    paymentMethod: text,
    paidAmount: text,
  }),
});

export const importRunSchema = z.object({
  batchId: text.refine((v) => v.trim().length > 0, common.invalidBody),
  fileHash: text.refine((v) => v.trim().length > 0, common.invalidBody),
  fileName: text.default(""),
  rows: z.array(importRowSchema).max(MAX_IMPORT_ROWS, common.invalidBody),
});

export type ImportRun = z.infer<typeof importRunSchema>;
