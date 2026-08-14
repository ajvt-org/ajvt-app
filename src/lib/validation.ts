import type { ZodType } from "zod";
import { ValidationError } from "./errors";

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);
  return result.data;
}
