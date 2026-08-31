import { z } from "zod";
import { common, memberImportErrors } from "@/lib/messages";

export const MAX_FILE_BYTES = 512 * 1024;

const NAME_MAX = 200;

export const importPreviewSchema = z.object({
  fileName: z
    .string(common.invalidBody)
    .transform((v) => v.trim().slice(0, NAME_MAX))
    .default(""),
  content: z
    .string(common.invalidBody)
    .refine((v) => v.length <= MAX_FILE_BYTES, memberImportErrors.fileTooBig),
});
